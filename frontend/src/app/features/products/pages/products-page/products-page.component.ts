import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../data-access/products.service';
import { Product } from '../../models/product.model';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { SessionService } from '../../../../core/services/session.service';
import { sanitizeInput } from '../../../../core/utils/sanitize.util';

const PRODUCT_DESCRIPTION_MIN_LENGTH = 10;
const PRODUCT_DESCRIPTION_MAX_LENGTH = 1500;

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.scss'
})
export class ProductsPageComponent implements OnInit {
  private productsService = inject(ProductsService);
  protected sessionService = inject(SessionService);
  protected readonly productDescriptionMinLength = PRODUCT_DESCRIPTION_MIN_LENGTH;
  protected readonly productDescriptionMaxLength = PRODUCT_DESCRIPTION_MAX_LENGTH;

  products: Product[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  editingProductId: number | null = null;
  form = this.buildEmptyForm();

  async ngOnInit() {
    await this.loadProducts();
  }

  get canManageProducts(): boolean {
    return this.sessionService.hasAnyRole('SuperAdmin', 'Registrador');
  }

  async loadProducts(): Promise<void> {
    this.loading = true;

    try {
      this.products = await this.productsService.getProducts();
    } catch (error) {
      console.error('Error cargando productos:', error);
      this.errorMessage = 'No se pudieron cargar los productos desde el backend.';
    } finally {
      this.loading = false;
    }
  }

  startCreate(): void {
    this.resetEditor();
  }

  startEdit(product: Product): void {
    this.editingProductId = product.id;
    this.form = {
      code: product.code,
      name: product.name,
      description: product.description,
      quantity: product.quantity,
      price: product.price,
      category: product.category
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  async saveProduct(): Promise<void> {
    if (!this.canManageProducts) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const editingProductId = this.editingProductId;
    const productPayload = {
      code: sanitizeInput(this.form.code),
      name: sanitizeInput(this.form.name),
      description: sanitizeInput(this.form.description),
      quantity: Number(this.form.quantity),
      price: Number(this.form.price),
      category: sanitizeInput(this.form.category)
    };

    const validationError = this.validateProductPayload(productPayload);

    if (validationError) {
      this.errorMessage = validationError;
      this.saving = false;
      return;
    }

    try {
      if (editingProductId !== null) {
        await this.productsService.updateProduct(editingProductId, {
          name: productPayload.name,
          description: productPayload.description,
          quantity: productPayload.quantity,
          price: productPayload.price,
          category: productPayload.category
        });

        await this.loadProducts();
        this.resetEditor(false);
        this.successMessage = 'Producto actualizado correctamente.';
      } else {
        await this.productsService.createProduct(productPayload);

        await this.loadProducts();
        this.resetEditor(false);
        this.successMessage = 'Producto creado correctamente.';
      }
    } catch (error: any) {
      const recovered = editingProductId !== null
        ? await this.tryRecoverUpdatedProduct(editingProductId, productPayload, error)
        : await this.tryRecoverCreatedProduct(productPayload, error);

      if (recovered) {
        return;
      }

      console.error('Error guardando producto:', error);
      this.errorMessage = error?.error?.message || 'No se pudo guardar el producto.';
    } finally {
      this.saving = false;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    if (!this.canManageProducts) {
      return;
    }

    const confirmed = window.confirm('Se eliminara logicamente este producto. Deseas continuar?');

    if (!confirmed) {
      return;
    }

    try {
      await this.productsService.deleteProduct(id);
      await this.loadProducts();
      if (this.editingProductId === id) {
        this.resetEditor(false);
      }
      this.successMessage = 'Producto eliminado correctamente.';
    } catch (error: any) {
      const recovered = await this.tryRecoverDeletedProduct(id, error);

      if (recovered) {
        return;
      }

      console.error('Error eliminando producto:', error);
      this.errorMessage = error?.error?.message || 'No se pudo eliminar el producto.';
    }
  }

  get activeProductsCount(): number {
    return this.products.filter((product) => product.is_active).length;
  }

  get totalUnits(): number {
    return this.products.reduce((total, product) => total + product.quantity, 0);
  }

  get categoryCount(): number {
    return new Set(this.products.map((product) => product.category)).size;
  }

  private buildEmptyForm() {
    return {
      code: '',
      name: '',
      description: '',
      quantity: 0,
      price: 0,
      category: ''
    };
  }

  private validateProductPayload(payload: {
    code: string;
    name: string;
    description: string;
    quantity: number;
    price: number;
    category: string;
  }): string | null {
    if (this.editingProductId === null && payload.code.length === 0) {
      return 'El codigo es obligatorio.';
    }

    if (payload.name.length === 0) {
      return 'El nombre es obligatorio.';
    }

    if (payload.description.length < PRODUCT_DESCRIPTION_MIN_LENGTH) {
      return `La descripcion debe tener al menos ${PRODUCT_DESCRIPTION_MIN_LENGTH} caracteres.`;
    }

    if (payload.description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
      return `La descripcion no puede exceder ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres.`;
    }

    if (payload.category.length === 0) {
      return 'La categoria es obligatoria.';
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity < 0) {
      return 'La cantidad debe ser un numero igual o mayor que 0.';
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      return 'El precio debe ser un numero igual o mayor que 0.';
    }

    return null;
  }

  private resetEditor(clearMessages = true): void {
    this.editingProductId = null;
    this.form = this.buildEmptyForm();

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  private async tryRecoverCreatedProduct(
    payload: {
      code: string;
      name: string;
      description: string;
      quantity: number;
      price: number;
      category: string;
    },
    error: any
  ): Promise<boolean> {
    if (!this.isRecoverableServerError(error)) {
      return false;
    }

    const refreshed = await this.refreshProductsForRecovery();

    if (!refreshed) {
      return false;
    }

    const createdProduct = this.products.find((product) => (
      product.code === payload.code
      && product.name === payload.name
      && product.description === payload.description
      && product.quantity === payload.quantity
      && Number(product.price) === payload.price
      && product.category === payload.category
    ));

    if (!createdProduct) {
      return false;
    }

    this.resetEditor(false);
    this.successMessage = 'El producto se creo correctamente. La API devolvio error despues de guardar, pero el registro ya existe.';
    return true;
  }

  private async tryRecoverUpdatedProduct(
    productId: number,
    payload: {
      code: string;
      name: string;
      description: string;
      quantity: number;
      price: number;
      category: string;
    },
    error: any
  ): Promise<boolean> {
    if (!this.isRecoverableServerError(error)) {
      return false;
    }

    const refreshed = await this.refreshProductsForRecovery();

    if (!refreshed) {
      return false;
    }

    const updatedProduct = this.products.find((product) => (
      product.id === productId
      && product.name === payload.name
      && product.description === payload.description
      && product.quantity === payload.quantity
      && Number(product.price) === payload.price
      && product.category === payload.category
    ));

    if (!updatedProduct) {
      return false;
    }

    this.resetEditor(false);
    this.successMessage = 'El producto se actualizo correctamente. La API devolvio error despues de guardar, pero los cambios ya quedaron aplicados.';
    return true;
  }

  private async tryRecoverDeletedProduct(id: number, error: any): Promise<boolean> {
    if (!this.isRecoverableServerError(error)) {
      return false;
    }

    const refreshed = await this.refreshProductsForRecovery();

    if (!refreshed) {
      return false;
    }

    const productStillExists = this.products.some((product) => product.id === id);

    if (productStillExists) {
      return false;
    }

    if (this.editingProductId === id) {
      this.resetEditor(false);
    }

    this.successMessage = 'El producto se elimino correctamente. La API devolvio error despues de guardar, pero la eliminacion ya fue aplicada.';
    return true;
  }

  private async refreshProductsForRecovery(): Promise<boolean> {
    try {
      this.products = await this.productsService.getProducts();
      return true;
    } catch {
      return false;
    }
  }

  private isRecoverableServerError(error: any): boolean {
    return error?.status === 500;
  }
}
