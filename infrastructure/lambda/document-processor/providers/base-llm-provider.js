/**
 * Base LLM Provider class with abstract methods.
 * All LLM providers much implement this methods.
 */

class BaseLLMProvider {
	constructor(config) {
		this.config = config;
	}

	createPayload(prompt) {
		throw new Error('Not implemented');
	}

	getModelFamily() {
		throw new Error('not implemented');
	}

	async processDocument(extractedText) {
		throw new Error('Not implemented');
	}

	parseResponse(response) {
		throw new Error('not implemented');
	}

	extractJSON(response) {
	}

	formatTiming(startTime, hrStartTime) {
	}

	createResult(status, options = {}) {
	}

// createPrompt(extractedText) {
// 		return `You are an expert at analyzing and classifying medical documents. Please analyze this medical document text and provide both classification and field extraction. You only respond with valid JSON. No explanations. No descriptions.

// DOCUMENT CLASSIFICATION:
// First, classify this document into one of these categories:
// - "lab_requisition": Laboratory test orders, sample collection requests
// - "lab_report": Laboratory test results, completed lab findings
// - "prescription_order": Medication prescriptions, pharmacy orders
// - "patient_registration": New patient forms, demographic information

// REQUIRED FIELDS TO EXTRACT:
// - firstName: Patient's first name
// - lastName: Patient's last name
// - dateOfBirth: Date of birth (MM/DD/YYYY format)
// - sex: Biological Sex (M or F)

// Here is the extracted text from the document:
// ${extractedText}

// Return ONLY a valid JSON object with this structure:
// {
// 	"documentClassification": {
// 	"primaryType": "category_name",
// 	"confidence": 0.95,
// 	"reasoning": "Brief explanation"
// 	},
// 	"extractedFields": {
// 	"firstName": "value or null",
// 	"lastName": "value or null",
// 	"dateOfBirth": "MM/DD/YYYY or null",
// 	"sex": "M, F, or null"
// 	}
// } JSON:`;
// 	}

createPrompt(extractedText) {
	return `You are an expert at analyzing and classifying medical documents. Please analyze this medical document text and provide both classification and field extraction. Ensure to return the data in a valid JSON format.

DOCUMENT CLASSIFICATION:
First, classify this document into one of these categories:

MEDICAL DOCUMENTS:
- "lab_requisition": Laboratory test orders, sample collection requests, blood draw orders, specimen collection forms
- "lab_report": Laboratory test results, blood work, urine tests, pathology reports, completed lab findings
- "prescription_order": Medication prescriptions, pharmacy orders, drug requests, medication orders
- "patient_registration": New patient forms, demographic information, intake forms
- "test_results": Radiology, imaging, diagnostic test results, scan reports
- "referral_form": Physician referrals, specialist consultations, transfer requests
- "medical_history": Patient history, medical records, past medical information
- "billing_statement": Medical bills, statements, invoices, payment records
- "appointment_form": Scheduling requests, appointment confirmations

INSURANCE DOCUMENTS:
- "insurance_verification": Insurance eligibility verification, coverage verification
- "insurance_prior_auth": Prior authorization requests, pre-approval forms
- "insurance_claim": Insurance claims, claim forms, reimbursement requests
- "insurance_eob": Explanation of Benefits, EOB statements, payment explanations
- "insurance_card": Insurance card copies, member ID cards
- "insurance_appeal": Appeals, grievances, dispute forms
- "insurance_enrollment": Plan enrollment, membership applications
- "insurance_denial": Coverage denials, rejection letters
- "insurance_policy": Policy documents, coverage summaries, plan details

GENERAL:
- "other": If none of the above categories fit clearly

REQUIRED FIELDS TO EXTRACT:

PATIENT INFORMATION:
- firstName: Patient's first name
- lastName: Patient's last name
- dateOfBirth: Date of birth (MM/DD/YYYY format)
- patientPhoneNumber: Patient's phone number
- patientStreetAddress: Street address only (no city/state/zip)
- patientAddressCity: City name only
- patientAddressState: State abbreviation
- patientAddressZip: Zip code
- sex: Biological Sex (M or F)

INSURANCE INFORMATION:
- insuranceId: Insurance ID or member number
- insuranceGroupNumber: Insurance group number
- insuranceCompany: Insurance company name
- policyNumber: Policy number (if different from member ID)
- planName: Insurance plan name or type
- effectiveDate: Insurance effective date
- expirationDate: Insurance expiration date
- copay: Copayment amount
- deductible: Deductible amount
- claimNumber: Claim number (for claims/EOBs)

MEDICAL INFORMATION:
- physicianName: Ordering/referring physician name
- physicianPhone: Physician phone number
- facilityName: Medical facility or hospital name
- testRequested: Type of test or procedure requested
- diagnosisCode: ICD code or diagnosis
- procedureCode: CPT or procedure code
- urgentStatus: Whether marked as urgent/STAT
- dateOfService: Date of service or collection date
- authorizationNumber: Prior authorization number

FINANCIAL INFORMATION:
- totalAmount: Total amount charged
- allowedAmount: Insurance allowed amount
- paidAmount: Amount paid by insurance
- patientResponsibility: Amount owed by patient

INSTRUCTIONS:
1. Analyze the extracted text carefully to understand the document's purpose and content
2. Classify the document type based on its primary function and content:
   - Look for "sample collection", "blood draw", "specimen" → lab_requisition
   - Look for "test results", "findings", "values" → lab_report
   - Look for "medication", "prescription", "dispense", "pharmacy" → prescription_order
3. Extract exact values as they appear in the text
4. If a field is not found, set it to null
5. For dates, convert to MM/DD/YYYY format if possible
6. If unable to determine the value for a field, set it to null
7. For sex, use the Biological Sex checkbox value, if M is checked, set it to M, if F is checked, set it to F, if neither is checked, set it to null

Here is the extracted text from the document:
${extractedText}

Return ONLY a valid JSON object with this structure:
{
  "documentClassification": {
    "primaryType": "category_name",
    "confidence": 0.95,
    "reasoning": "Brief explanation of why this classification was chosen"
  },
  "extractedFields": {
    "firstName": "value or null",
    "lastName": "value or null",
    "dateOfBirth": "MM/DD/YYYY or null",
    "patientPhoneNumber": "value or null",
    "patientStreetAddress": "value or null",
    "patientAddressCity": "value or null",
    "patientAddressState": "value or null",
    "patientAddressZip": "value or null",
    "sex": "M, F, or null",
    "insuranceId": "value or null",
    "insuranceGroupNumber": "value or null",
    "insuranceCompany": "value or null",
    "policyNumber": "value or null",
    "planName": "value or null",
    "effectiveDate": "MM/DD/YYYY or null",
    "expirationDate": "MM/DD/YYYY or null",
    "copay": "value or null",
    "deductible": "value or null",
    "claimNumber": "value or null",
    "physicianName": "value or null",
    "physicianPhone": "value or null",
    "facilityName": "value or null",
    "testRequested": "value or null",
    "diagnosisCode": "value or null",
    "procedureCode": "value or null",
    "urgentStatus": "value or null",
    "dateOfService": "MM/DD/YYYY or null",
    "authorizationNumber": "value or null",
    "totalAmount": "value or null",
    "allowedAmount": "value or null",
    "paidAmount": "value or null",
    "patientResponsibility": "value or null"
  }
} JSON:`;
	}
}

module.exports = BaseLLMProvider;