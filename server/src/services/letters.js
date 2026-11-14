// Plain templates used when AI is unavailable. Factual wording; no accusations.
const today = () => new Date().toLocaleDateString('en-GB');

export const complaintTemplate = (r) => {
  const loc = r.address?.formatted
    ? `${r.address.formatted} (Coordinates: ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)})`
    : `coordinates ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`;

  return `To The Officer In Charge,
${r.department}

Subject: Request for action - ${r.category} (priority ${r.priority}/10)

I am writing to report a ${r.severity}-severity ${r.category.toLowerCase()} issue at ${loc}.

Description: ${r.description}

Kindly arrange an inspection and appropriate repair at the earliest, and inform the reporter of the action taken.

Date: ${today()}

Yours faithfully,
Smart City Platform`;
};

export const disputeTemplate = ({ tender, category, description, userName }) => `To,
The Superintending Engineer / Chief Vigilance Officer
${tender.department}

Subject: Request for inspection and information - Tender ${tender.tenderId}

Project: ${tender.title}
Contractor: ${tender.contractor}
Concern raised: ${category}

Observation reported by a citizen:
${description}

Under the Right to Information Act, 2005, I request (1) an independent site inspection, (2) the inspection report and quality-test records for this work, and (3) confirmation of the applicable defect-liability obligations (${tender.warranty || 'as per agreement'}).

Date: ${today()}
Submitted by: ${userName} (via Smart City Platform)`;
