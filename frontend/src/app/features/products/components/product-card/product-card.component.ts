import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() canManage = false;

  @Output() editProduct = new EventEmitter<Product>();
  @Output() deleteProduct = new EventEmitter<number>();

  onEdit(): void {
    this.editProduct.emit(this.product);
  }

  onDelete(): void {
    this.deleteProduct.emit(this.product.id);
  }
}
