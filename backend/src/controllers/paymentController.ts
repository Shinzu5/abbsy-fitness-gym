import { Request, Response } from "express";
import * as paymentService from "../services/paymentService";

export async function getPayments(_req: Request, res: Response) {
  const payments = await paymentService.listPayments();
  res.json(payments);
}

export async function getTodayPayments(_req: Request, res: Response) {
  const data = await paymentService.getTodayOpenPayments();
  res.json(data);
}

export async function createPayment(req: Request, res: Response) {
  const payment = await paymentService.createPayment(req.body);
  res.status(201).json(payment);
}

export async function closeDailySales(_req: Request, res: Response) {
  const result = await paymentService.closeDailySales();
  res.json(result);
}
