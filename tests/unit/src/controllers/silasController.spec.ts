import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon"
import { callbackAction, loginAction, processUATRedirect } from "#src/controllers/silasController.js";
import config from "#config.js";
import { createTestRequest, createTestResponse } from "./index.js";


describe("Process uat redirect", ()=>{
    beforeEach(()=>{
        sinon.stub(config.app, "environment").value("ephemeral")
        
        sinon.stub(config, "SERVICE_URL").value("test-laa-cla-operator-app.cloud-platform.service.justice.gov.uk")
    })
    afterEach(()=>{
        sinon.restore()
    })
    it("Redirect from ephemeral to UAT", async ()=>{
        assert.equal(config.silas.redirectUri, "http://localhost:3000/redirect")
        const req = createTestRequest()
        const res = createTestResponse()
        const redirect = res.redirect as sinon.SinonStub
        await loginAction(req, res)
        const redirectURL = new URL((redirect.args[0]) as unknown as string)
        
        assert.equal(redirectURL.origin, "http://localhost:3000")
        assert.equal(redirectURL.pathname, "/login")
        assert.equal(redirectURL.searchParams.get("return_to"), `https://${config.SERVICE_URL}/redirect`)

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(redirectURL.searchParams.get("nonce") as string);
        assert.equal(isUuid, true)
    })
    it("UAT receives redirect from ephemeral", async ()=>{
        sinon.stub(config.app, "environment").value("uat")
        const req = createTestRequest()
        const res = createTestResponse()
        req.query.return_to = `http://${config.SERVICE_URL}/login`
        req.query.nonce = "000-0000-0000-0000"
        const sessionSave = req.session.save as sinon.SinonStub
        const redirect = res.redirect as sinon.SinonStub
        
        const shouldRedirect = await processUATRedirect(req, res)
        assert.equal(shouldRedirect, false)
        assert.equal(redirect.notCalled, true)
        assert.equal(sessionSave.called, true)
        assert.equal(req.session.return_to, `http://${config.SERVICE_URL}/login`)
        assert.equal(req.session.auth_nonce, "000-0000-0000-0000")

    })
    it("UAT receives redirect from ephemeral with invalid return to", async ()=>{
        sinon.stub(config.app, "environment").value("uat")
        const req = createTestRequest()
        const res = createTestResponse()
        req.query.return_to = `http://test.justice.gov.uk/login`
        req.query.nonce = "000-0000-0000-0000"
        const sessionSave = req.session.save as sinon.SinonStub
        const redirect = res.redirect as sinon.SinonStub
        try {
            await processUATRedirect(req, res)
        }
        catch (error) {
            assert.equal((error as Error).message, "Return to does not belong to our namespace: http://test.justice.gov.uk/login")
        }
        assert.equal(redirect.notCalled, true)
        assert.equal(sessionSave.called, false)
        assert.equal(req.session.return_to, undefined)
        assert.equal(req.session.auth_nonce, undefined)
    })

    it("Silas callback proxys to ephemeral on UAT", ()=>{
        sinon.stub(config.app, "environment").value("uat")
        const req = createTestRequest()
        const res = createTestResponse()
        req.session.return_to = `https://${config.SERVICE_URL}/callback`
        req.query.state = "000-0000-0000-0000"
        req.query.code = "1111-1111-1111-111"
        const redirect = res.redirect as sinon.SinonStub
        callbackAction(req, res)
        const redirectURL = new URL((redirect.args[0]) as unknown as string)
        assert.equal(redirectURL.origin, `https://${config.SERVICE_URL}`)
        assert.equal(redirectURL.pathname, "/callback")
        assert.equal(redirectURL.searchParams.get("state"), "000-0000-0000-0000")
        assert.equal(redirectURL.searchParams.get("code"), "1111-1111-1111-111")
    })
})
