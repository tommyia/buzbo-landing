export const SITE_NAME = 'Buzbo';

export const DEFAULT_KEYWORDS =
	'Buzbo, professional networking, skills-based networking, hiring, career, CV, job search, Netherlands, waitlist, professional community';

export const PAGE_SEO = {
	home: {
		title: 'Buzbo — Showcase who you really are',
		description:
			"Buzbo is a skills-based networking platform that shows who you really are — your skills, interests, and the work you're proud of. Join the waitlist.",
		keywords: DEFAULT_KEYWORDS,
		image: '/hero-bg.png',
	},
	blog: {
		title: 'Blog',
		description: 'Stories, updates, and insights from the Buzbo team on networking, careers, and showing up as yourself.',
		keywords: `${DEFAULT_KEYWORDS}, blog, career advice, professional insights`,
		image: '/blog-banner.png',
	},
	faq: {
		title: 'FAQ — Buzbo',
		description: 'Common questions about Buzbo, the skills-based professional networking platform.',
		keywords: `${DEFAULT_KEYWORDS}, FAQ, help`,
	},
	privacy: {
		title: 'Privacy Policy — Buzbo',
		description: 'Read the Buzbo Privacy Policy: what personal data we collect, why we use it, and your rights.',
		keywords: 'Buzbo, privacy policy, personal data, GDPR',
	},
	terms: {
		title: 'Terms & Conditions — Buzbo',
		description: 'Read the Buzbo Terms & Conditions for using the app, website, and related services.',
		keywords: 'Buzbo, terms and conditions, terms of use',
	},
	childSafety: {
		title: 'Child Safety Standards — Buzbo',
		description:
			'Buzbo\'s published standards against child sexual abuse and exploitation, and how to report a concern.',
		keywords: 'Buzbo, child safety, CSAE, CSAM, reporting',
	},
} as const;
