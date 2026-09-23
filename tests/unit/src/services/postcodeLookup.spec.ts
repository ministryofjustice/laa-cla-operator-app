import { describe, it } from "mocha";
import sinon from "sinon"
import assert from "node:assert/strict";
import config from "#config.js";
import { PostcodeLookupService } from "#src/services/postcodeLookup.js";
import { Address } from "#types/postcode-lookup-types.js";


const TEST_POSTCODE_LOOKUP_RESPONSE = {
    results: [
        {
            DPA: {
                UPRN: '00000000000',
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
    let configStub: sinon.SinonStub = sinon.stub();
    let fetchStub: sinon.SinonStub = sinon.stub();
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
            /**
             * Override what fetch.json returns
             * @returns {Record<any: any>} - A json object  
             */
            // eslint-disable-next-line @typescript-eslint/require-await -- We are mocking the original json method
            json: async () => (TEST_POSTCODE_LOOKUP_RESPONSE)
        })

        const addresses = await postcodeLookupService.byPostcode("MINISTRY OF JUSTICE", "SW1H 9AJ")
        assert(Array.isArray(addresses))
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- We are checking atleast one result is returned
        assert(addresses.length === 1)
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers, @typescript-eslint/prefer-destructuring -- Get the first address returned
        const { address, postcode, uprn } = addresses[0];
        assert.deepEqual({ address, postcode, uprn }, {address: "MINISTRY OF JUSTICE SEVENTH FLOOR 102 PETTY FRANCE LONDON SW1H 9AJ", postcode: "SW1H 9AJ", uprn: "00000000000"})
    })

    it("lookup invalid postcode", async () => {
        fetchStub.resolves({
            ok: true,
            /**
             * Override what fetch.json returns
             * @returns {Record<any: any>} - A json object  
             */
            // eslint-disable-next-line @typescript-eslint/require-await -- We are mocking the original json method
            json: async () => ({})
        })
        const addresses = await postcodeLookupService.byPostcode("MINISTRY OF JUSTICE", "SW1 1AA")
        assert.deepEqual(addresses, [])
        
    })

    it("lookup address by uprn", async () => {
        fetchStub.resolves({
            ok: true,
            /**
             * Override what fetch.json returns
             * @returns {Record<any: any>} - A json object  
             */
            // eslint-disable-next-line @typescript-eslint/require-await -- We are mocking the original json method
            json: async () => (TEST_POSTCODE_LOOKUP_RESPONSE)
        })
        const result = await postcodeLookupService.byUPRN("00000000000")
        assert(result instanceof Address)
        const { address, postcode, uprn } = result;
        assert.deepEqual({address, postcode, uprn}, {address: "MINISTRY OF JUSTICE SEVENTH FLOOR 102 PETTY FRANCE LONDON", postcode: "SW1H 9AJ", uprn: "00000000000"})
    })

    it("lookup address by invalid uprn", async () => {
    fetchStub.resolves({
        ok: true,
        /**
         * Override what fetch.json returns
         * @returns {Record<any: any>} - A json object  
         */
        // eslint-disable-next-line @typescript-eslint/require-await -- We are mocking the original json method
        json: async () => ([])
    })
    const result = await postcodeLookupService.byUPRN("10000000000")
    assert(result == null)
})

    it("Missing os places key", async () => {
        configStub.value(null)
        const addresses = await postcodeLookupService.byPostcode("MINISTRY OF JUSTICE", "SW1H 9AJ")
        assert.deepEqual(addresses, [])
    })
})
