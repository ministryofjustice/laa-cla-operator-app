import config from "#config.js";


interface AddressLookupDPAResponse {
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

interface AddressLookUpResult {
    DPA: AddressLookupDPAResponse;
}

interface AddressLookUpResponse {
    results: AddressLookUpResult[];
}

export class Address {
    address: string;
    uprn: string;
    postcode: string

    constructor(data: AddressLookupDPAResponse, includePostcodeInAddess: boolean = true) {
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
        this.uprn = data.UPRN
        this.postcode = data.POSTCODE
    }
}

export class PostcodeLookupService {
    async lookup(endpoint: "find" | "uprn", params: URLSearchParams, includePostcodeInAddess: boolean = true): Promise<Address[]> {
        const response = await fetch(`https://api.os.uk/search/places/v1/${endpoint}?${params}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        })
        const data = (await response.json()) as AddressLookUpResponse;
        if(!data.results) {
            return [];
        }
        const addresses = data.results.map(
            result => { 
                const address = new Address(result.DPA, includePostcodeInAddess);
                return address
            })
        return addresses
    }

    async byPostcode (building: string, postcode: string): Promise<Address[] | null>{
        if(!config.OS_PLACES_API_KEY) {
            return null;
        }
        if(!postcode) {
            return null;
        }
        const params = new URLSearchParams({
            query: `${building} ${postcode}`,
            key: config.OS_PLACES_API_KEY,
            output_srs: "WGS84",
            dataset: "DPA",
        });
        return await this.lookup("find", params)
    }

    async byUPRN(uprn: string): Promise<Address | null> {
        if(!config.OS_PLACES_API_KEY) {
            return null;
        }
        if(!uprn) {
            return null;
        }
        const params = new URLSearchParams({
            uprn,
            key: config.OS_PLACES_API_KEY,
            output_srs: "WGS84",
            dataset: "DPA",
        });
        const addresses = await this.lookup("uprn", params, false)
        return addresses[0]

    }
}
