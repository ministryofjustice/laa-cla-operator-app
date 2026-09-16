import type { Request, Response } from 'express';

/**
 * Saves a user's address.
 * @param req - Express request object; expects address fields in req.body
 * @param res - Express response object; used to send a JSON response
 */
export function saveAddress(req: Request, res: Response) {
    res.json({
        success: true,
        message: 'Address saved successfully',
        data: req.body,
    });
}

/**
 * Returns data needed to render the address form.
 * @param req - Express request object; may contain query/params for pre-filling the form
 * @param res - Express response object; used to send a JSON response
 */
export function showAddressForm(req: Request, res: Response) {
    res.render("main/forms/addAddress.njk")
}