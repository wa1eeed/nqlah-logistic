import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFreelancerInvoiceDto {
  /** Order number or a synthetic consolidated-leg id. */
  @IsString() orderId!: string;
  @IsString() orderNumber!: string;
  @IsString() truckId!: string;
  @IsOptional() @IsString() driverId?: string;
  /** Trip fee owed to the freelancer (SAR). */
  @IsNumber() @Min(0) amount!: number;
  /** What the carrier earns from the client on this order/leg (for margin). */
  @IsOptional() @IsNumber() orderRevenue?: number;
}
