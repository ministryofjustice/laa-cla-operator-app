import config from "#config.js";


interface AddressLookupDPAResponse {
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

class Address {
    address: string;

    constructor(data: AddressLookupDPAResponse) {
        this.address = [
            data.ORGANISATION_NAME,
            data.SUB_BUILDING_NAME,
            data.BUILDING_NAME,
            data.BUILDING_NUMBER,
            data.THOROUGHFARE_NAME,
            data.DEPENDENT_LOCALITY,
            data.POST_TOWN,
            data.POSTCODE
        ].filter(Boolean).join(" ");
    }
}

export const  postcodeLookup = async (building: string, postcode: string): Promise<{ address: string }[] | null>  =>{
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
    const response = await fetch(`https://api.os.uk/search/places/v1/find?${params}`, {
        headers: {
            'Content-Type': 'application/json',
        },
    })
    const data = (await response.json()) as AddressLookUpResponse;
    if(!data.results) {
        return [];
    }
    const addresses = data.results.map(
        result => ({ address: new Address(result.DPA).address })
    );
    return addresses
}