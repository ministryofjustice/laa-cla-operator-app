import sinon from "sinon"
import type { Request, Response } from "express";


export function createTestRequest(): Request  {
    return {
        session: {
            save: sinon.stub().callsArgWith(0, null),
        },
        query: {}
    } as unknown as Request;
}

export function createTestResponse(): Response {
    return {
        redirect: sinon.stub(),
        send: sinon.stub(),
    } as unknown as Response;
}