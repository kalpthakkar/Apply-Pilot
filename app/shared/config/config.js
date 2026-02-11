export const DB_KEY_MAP = {
    // Auth Info
    EMAIL: 'email',
    USERNAME: 'username',
    PASSWORD: 'password',
    SECONDARY_PASSWORD: 'secondaryPassword',
    
    // Personal Info
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    PREFERRED_NAME: 'preferredName',
    PHONE_EXTENSION: 'phoneExtension',
    PHONE_NUMBER: 'phoneNumber',
    BIRTHDATE: 'birthDate',
    LINKEDIN: 'linkedin',
    GITHUB: 'github',
    PORTFOLIO: 'portfolio',
    OTHER_URLS: 'otherURLs', // Array[]
    
    // Addresses []
    ADDRESSES: 'addresses',
    ADDRESS_LINE_1: 'addresses.addressLine1',
    ADDRESS_LINE_2: 'addresses.addressLine2',
    CITY: 'addresses.city',
    STATE: 'addresses.state',
    COUNTRY: 'addresses.country',
    POSTAL_CODE: 'addresses.postalCode',
    PRIMARY_ADDRESS: 'addresses[primaryAddressContainerIdx]',
    PRIMARY_ADDRESS_CONTAINER_IDX: 'primaryAddressContainerIdx',
    USE_LLM_ADDRESS: 'llmAddressSelectionEnabled',

    // Resumes []
    RESUME: 'resumes',
    RESUME_CATEGORY: 'resumes.resumeCategory',
    RESUME_COUNTRY: 'resumes.resumeCountry',
    RESUME_STATE: 'resumes.resumeState',
    RESUME_CITY: 'resumes.resumeCity',
    RESUME_REGION: 'resumes.resumeRegion',
    RESUME_PATH: 'resumes.resumeStoredPath',
    PRIMARY_RESUME: 'resumes[primaryResumeContainerIdx]',
    PRIMARY_RESUME_CONTAINER_IDX: 'primaryResumeContainerIdx',
    USE_LLM_RESUME: 'llmResumeSelectionEnabled',

    // Work Experiences []
    WORK_EXPERIENCES: 'workExperiences',
    WORK_EXPERIENCES_JOB_TITLE: 'workExperiences.jobTitle',
    WORK_EXPERIENCES_COMPANY_NAME: 'workExperiences.company',
    WORK_EXPERIENCES_JOB_LOCATION_TYPE: 'workExperiences.jobLocationType',
    WORK_EXPERIENCES_LOCATION: 'workExperiences.location',
    WORK_EXPERIENCES_JOB_TYPE: 'workExperiences.jobType',
    WORK_EXPERIENCES_ROLE_DESCRIPTION: 'workExperiences.roleDescription',
    WORK_EXPERIENCES_START_DATE: 'workExperiences.startDate',
    WORK_EXPERIENCES_END_DATE: 'workExperiences.endDate',
    WORK_EXPERIENCES_REASON_FOR_LEAVING: 'workExperiences.reasonForLeaving',
    
    // Education []
    EDUCATION: 'education',
    EDUCATION_SCHOOL: 'education.school',
    EDUCATION_DEGREE: 'education.degree',
    EDUCATION_MAJOR: 'education.major',
    EDUCATION_START_DATE: 'education.startDate',
    EDUCATION_END_DATE: 'education.endDate',
    EDUCATION_GPA: 'education.gpa',

    // Projects {}
    PROJECTS: 'projects',
    // Achievements {}
    ACHIEVEMENTS: 'achievements',

    // Additional Info
    SKILLS: 'skills',
    ENABLE_USER_SKILLS_SELECTION: 'enabledUserSkillsSelection',
    ENABLE_JOB_SKILLS_SELECTION: 'enabledJobSkillsSelection',
    ENABLE_RELATED_SKILLS_SELECTION: 'enabledRelatedSkillsSelection',
    SALARY_EXPECTATIONS: 'salaryExpectation',   // {min: number, max: number}
    RELOCATION_PREFERENCE: 'relocationPreference',
    RELOCATION_SUPPORT: 'relocationSupport',
    ACCOMODATION_SUPPORT: 'accomodationSupport',
    REMOTE_WORK_PREFERENCE: 'remoteWorkPreference',

    // EEO (Employment Info)
    EMPLOYMENT_INFO: 'employmentInfo',
    VISA_SPONSORSHIP_REQUIREMENT: 'employmentInfo.visaSponsorshipRequirement',
    VISA_STATUS: 'employmentInfo.visaStatus',
    WORK_AUTHORIZATION: 'employmentInfo.workAuthorization',
    RIGHT_TO_WORK: 'employmentInfo.rightToWork',
    BACKGROUND_CHECK: 'employmentInfo.backgroundCheck',
    EMPLOYMENT_RESTRICTIONS: 'employmentInfo.employmentRestrictions',
    NON_COMPLETE_RESTRICTIONS: 'employmentInfo.nonCompleteRestrictions',
    SECURITY_CLEARANCE: 'employmentInfo.securityClearance',
    CITIZENSHIP_STATUS: 'employmentInfo.citizenshipStatus',
    GENDER: 'employmentInfo.gender',
    SEXUAL_ORIENTATION: 'employmentInfo.sexualOrientation',
    LGBTQ_STATUS: 'employmentInfo.lgbtqStatus',
    ETHNICITY: 'employmentInfo.ethnicity',                  // Array[]
    HISPANIC_OR_LATINO: 'employmentInfo.hispanicOrLatino',
    MILITARY_SERVICE: 'employmentInfo.militaryService',
    VETERAN_STATUS: 'employmentInfo.veteranStatus',
    DISABILITY_STATUS: 'employmentInfo.disabilityStatus',  
}
