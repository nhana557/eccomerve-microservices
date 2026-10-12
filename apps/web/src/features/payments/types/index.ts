export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  va_number?: string;
  qr_string?: string;
  paid_at?: string;
  transaction_time?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  order_id: string;
  amount: number;
  payment_method: string;
}
