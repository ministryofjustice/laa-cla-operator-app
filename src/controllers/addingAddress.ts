import type { Request, Response } from 'express';

/**
 * Saves a user's address.
 * @param {Request} req - Express request object; expects address fields in req.body
 * @param {Response} res - Express response object; used to send a JSON response
 * @returns {void}
 */
export function saveAddress(req: Request, res: Response): void {
  const data: unknown = req.body;

  res.json({
    success: true,
    message: 'Address saved successfully',
    data,
  });
}

/**
 * Returns data needed to render the address form.
 * @param {Request} req - Express request object; may contain query/params for pre-filling the form
 * @param {Response} res - Express response object; used to send a JSON response
 * @returns {void}
 */
export function showAddressForm(req: Request, res: Response): void {
  res.render('main/forms/addAddress.njk');
}