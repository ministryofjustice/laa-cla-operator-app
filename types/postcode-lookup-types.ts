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
