import { describe, it } from "mocha";
import sinon from "sinon"
import assert from "node:assert/strict";
import config from "#config.js";
import { PostcodeLookupService } from "#src/services/postcodeLookup.js";


const TEST_POSTCODE_LOOKUP_RESPONSE = {
    results: [
        {
            DPA: {
                ADDRESS: 'MINISTRY OF JUSTICE, SEVENTH FLOOR, 102, PETTY FRANCE, LONDON, SW1H 9AJ',
                ORGANISATION_NAME: 'MINISTRY OF JUSTICE',
                SUB_BUILDING_NAME: 'SEVENTH FLOOR',
                BUILDING_NUMBER: '102',
                THOROUGHFARE_NAME: 'PETTY FRANCE',
                POST_TOWN: 'LONDON',
                POSTCODE: 'SW1H 9AJ',
            }
        }
    ]
}

describe("Postcode lookup", ()=>{
    let configStub: sinon.SinonStub;
    let fetchStub: sinon.SinonStub;
    const postcodeLookupService = new PostcodeLookupService()

    beforeEach(() => {
        fetchStub = sinon.stub(globalThis, "fetch")

        configStub = sinon.stub(config, "OS_PLACES_API_KEY")
        configStub.value("THIS+IS+TEST+KEY")
    })

    afterEach(()=>{
        configStub.restore()
        fetchStub.restore()
    })

    it("lookup valid postcode", async () => {
        fetchStub.resolves({
            ok: true,
            json: async () => (TEST_POSTCODE_LOOKUP_RESPONSE)
        } as Response)

        const addresses = await postcodeLookupService.byPostcode("MINISTRY OF JUSTICE", "SW1H 9AJ")
        assert(Array.isArray(addresses))
        assert(addresses.length == 1)
        assert.equal(addresses[0].address, "MINISTRY OF JUSTICE SEVENTH FLOOR 102 PETTY FRANCE LONDON SW1H 9AJ")
    })

    it("lookup invalid postcode", async () => {
        fetchStub.resolves({
            ok: true,
            json: async () => ({})
        } as Response)
        const addresses = await postcodeLookupService.byPostcode("MINISTRY OF JUSTICE", "SW1 1AA")
        assert.deepEqual(addresses, [])
    })

    it("Missing os places key", async () => {
        configStub.value(null)
        const addresses = await postcodeLookupService.byPostcode("MINISTRY OF JUSTICE", "SW1H 9AJ")
        assert.equal(addresses, null)
    })

})