import config from "#config.js";

export interface AddressLookupDPAResponse {
    UPRN: string;
    POSTCODE: string;
    ORGANISATION_NAME?: string;
    SUB_BUILDING_NAME?: string;
    BUILDING_NAME?: string;
    BUILDING_NUMBER?: string;
    THOROUGHFARE_NAME?: string;
    DEPENDENT_LOCALITY?: string;
    POST_TOWN?: string;
}

export interface AddressLookUpResult {
    DPA: AddressLookupDPAResponse;
}

export interface AddressLookUpResponse {
    results?: AddressLookUpResult[];
}

/**
 * An instance of this class is returned from search results
 */
export class Address {
    address: string;
    uprn: string;
    postcode: string

    /**
     * Address constructor
     * @param {AddressLookupDPAResponse} data - The address lookup result
     * @param {boolean} includePostcodeInAddess - Whether to include the postcode in the formatted address
     */
    constructor(data: AddressLookupDPAResponse, includePostcodeInAddess = true) {
        this.address = [
            data.ORGANISATION_NAME,
            data.SUB_BUILDING_NAME,
            data.BUILDING_NAME,
            data.BUILDING_NUMBER,
            data.THOROUGHFARE_NAME,
            data.DEPENDENT_LOCALITY,
            data.POST_TOWN,
            includePostcodeInAddess ? data.POSTCODE : null
        ].filter(Boolean).join(" ");
        // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Direct property access is clearer here
        this.uprn = data.UPRN
        // eslint-disable-next-line @typescript-eslint/prefer-destructuring -- Direct property access is clearer here
        this.postcode = data.POSTCODE
    }
}

/**
 * Postcode lookup service
 */
export class PostcodeLookupService {
    /**
     * Utility lookup method that is used by other lookup methods in this class
     * @param {"find" | "uprn"} endpoint - OS Places endpoint to use for address lookup
     * @param {URLSearchParams} params - Parameters to pass to the address lookup endpoint
     * @param {boolean} includePostcodeInAddess - Whether to include the postcode in the formatted address
     * @returns {Address[]} - Returns list of addresses found
     */
    // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Utility method
    async lookup(endpoint: "find" | "uprn", params: URLSearchParams, includePostcodeInAddess = true): Promise<Address[]> {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- this will capture all untruthy including null and undefined
        if(!config.OS_PLACES_API_KEY) {
            return [];
        }
        params.append("key", config.OS_PLACES_API_KEY)

        const response = await fetch(`https://api.os.uk/search/places/v1/${endpoint}?${params}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- OS Places API response is expected to match AddressLookUpResponse
        const data = (await response.json()) as AddressLookUpResponse;
        if(data.results === undefined) {
            return [];
        }
        const addresses = data.results.map(
            result => { 
                const address = new Address(result.DPA, includePostcodeInAddess);
                return address
            })
        return addresses
    }

    /**
     * Lookup an address by postcode and building name/number
     * @param {string} building - The building for postcode lookup
     * @param {string} postcode - The postcode to lookup
     * @returns {Address[] | null} - A list of matched addresses
     */
    async byPostcode (building: string, postcode: string): Promise<Address[]>{
        const params = new URLSearchParams({
            query: `${building} ${postcode}`,
            output_srs: "WGS84",
            dataset: "DPA",
        });
        return await this.lookup("find", params)
    }

    /**
     * Lookup an address by a given unique property reference number
     * @param {string} uprn - The unique property reference
     * @returns {Address | null} - The matched address
     */
    async byUPRN(uprn: string): Promise<Address | null> {
        const params = new URLSearchParams({
            uprn,
            output_srs: "WGS84",
            dataset: "DPA",
        });
        const addresses = await this.lookup("uprn", params, false)
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- return the first address found
        return addresses.length > 0 ? addresses[0] : null
    }
    /* c8 ignore next */
}
