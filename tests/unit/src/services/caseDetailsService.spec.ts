import type { AxiosInstanceWrapper } from '#types/axios-instance-wrapper.js';
import { getAllCases, updatePersonalDetails } from '#src/services/api/caseDetailsService.js';
import { strict as assert } from 'assert';
import { expect } from 'chai';
import sinon from 'sinon';


describe('caseDetailsService', () => {
    let axiosMiddlewareStub: AxiosInstanceWrapper;
    let getStub: sinon.SinonStub;
    let postStub: sinon.SinonStub;
    let putStub: sinon.SinonStub;
    let patchStub: sinon.SinonStub;
    
    beforeEach(() => {
        getStub = sinon.stub();
        postStub = sinon.stub();
        putStub = sinon.stub();
        patchStub = sinon.stub();


        axiosMiddlewareStub = {
        axiosInstance: {
            defaults: {
            baseURL: '',
            headers: {
                common: {}
            }
            },
            interceptors: {
            request: { use: sinon.stub() },
            response: { use: sinon.stub() }
            },
            get: getStub,
            post: postStub,
            put: putStub,
            delete: sinon.stub(),
            patch: patchStub
            },
        // Direct methods that AxiosInstanceWrapper should have
        get: getStub,
        post: postStub,
        put: putStub,
        delete: sinon.stub(),
        request: sinon.stub(),
        head: sinon.stub(),
        options: sinon.stub(),
        patch: patchStub,
        use: sinon.stub()
        } as any;
    });

    afterEach(() => {
        sinon.restore();

        getStub.reset();
        postStub.reset();
        putStub.reset();
        patchStub.reset();
    });


    describe('getAllCases', () => {
        it('should fetch all cases', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    results: [
                    {
                        reference: 'FA-3465-9114',
                        created: '2022-03-29T18:13:50.596Z',
                        modified: '2022-03-29T18:15:56.782Z',
                        full_name: 'Jo Smith',
                        laa_reference: 3000003,
                        eligibility_state: null,
                        personal_details: '95e85bc7406c429e8fd655562406f6b2',
                        requires_action_by: '1_provider_review',
                        postcode: 'OX2 0LD',
                        rejected: false,
                        date_of_birth: '2003-02-01',
                        category: null,
                        outcome_code: 'MANALC',
                        outcome_description: 'Manually allocated to Specialist',
                        case_count: 1,
                        source: 'PHONE',
                        requires_action_at: null,
                        callback_time_string: null,
                        flagged_with_eod: false,
                        is_urgent: false,
                        organisation_name: null
                    }],
                    count: 1
                }
            };

            getStub.resolves(mockResponse);

            // Act
            const result = await getAllCases(axiosMiddlewareStub);

            // Assert
            expect(result).to.deep.equal(mockResponse.data);
            expect(result.results).to.deep.equal(mockResponse.data.results);
        });

        it('wraps API failures with a user-friendly message and preserves cause', async () => {
            // Arrange
            const originalError = new Error('backend unavailable');
            getStub.rejects(originalError);

            // Act / Assert
            await assert.rejects(
                () => getAllCases(axiosMiddlewareStub),
                (error: unknown) => {
                    assert(error instanceof Error);
                    assert.equal(error.message, 'An unexpected error occurred. Please try again.');
                    assert.equal(error.cause, originalError);
                    return true;
                }
            );
        });
    });

    describe('updatePersonalDetails', () => {
        it('should update personal details for a case', async () => {
            // Arrange
            const caseId = 'case/id TX-123-FR5';
            const body = { address: { line1: '123 Main St', city: 'Anytown' } };
            putStub.resolves();

            // Act
            await updatePersonalDetails(axiosMiddlewareStub, caseId, body);

            // Assert
            expect(putStub.calledOnce).to.be.true;
            expect(putStub.firstCall.args[0]).to.equal(`/call_centre/api/v1/case/${encodeURIComponent(caseId)}/personal_details/`);
            expect(putStub.firstCall.args[1]).to.deep.equal(body);
        });

        it('wraps update failures with a user-friendly message and preserves cause', async () => {
            // Arrange
            const originalError = new Error('update unavailable');
            putStub.rejects(originalError);

            // Act / Assert
            await assert.rejects(
                () => updatePersonalDetails(axiosMiddlewareStub, 'case-id', { address: {} }),
                (error: unknown) => {
                    assert(error instanceof Error);
                    assert.equal(error.message, 'An unexpected error occurred. Please try again.');
                    assert.equal(error.cause, originalError);
                    return true;
                }
            );
        });
    });
});