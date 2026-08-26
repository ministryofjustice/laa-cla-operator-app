from pydantic import BaseModel, Field


class PersonalDetails(BaseModel):
    full_name: str = ""
    phone: str = ""
    postcode: str = ""
    date_of_birth: str = ""


class SearchResultRow(BaseModel):
    id: int | None = None
    name: str = ""
    phone: str = ""
    postcode: str = ""
    dob: str = ""
    dob_sort: str = ""


class SearchPagination(BaseModel):
    page: int = 1
    per_page: int = 20
    total_pages: int = 1
    total_records: int = 0
    start: int = 0
    end: int = 0


class SearchResponse(BaseModel):
    result: list[SearchResultRow] = Field(default_factory=list)
    pagination: SearchPagination = Field(default_factory=SearchPagination)
