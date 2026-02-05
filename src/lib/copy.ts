/**
 * GoldenGooseTees UI Copy
 * Fun, lighthearted, encouraging language across the app
 */

export const copy = {
  // Auth
  joinTheFlock: 'Join the Flock',
  signInOrCreate: 'Sign in or create an account',
  signInDescription: 'Sign in to publish your design, place an order, or manage your account. We\'ll ask for your birthday so we can keep the experience safe for everyone.',
  continueWithGoogle: 'Continue with Google',
  signingIn: 'Brewing Magic...',
  signingUp: 'Creating your nest...',
  createAccount: 'Create Account',
  signIn: 'Sign In',
  alreadyHaveAccount: 'Already have an account? Sign in',
  newHere: 'New here? Create an account',

  // Product / Catalog
  pickYourSpecs: 'Pick size & color',
  customizeIt: 'Customize It',
  selectSize: 'Select Size',
  selectColor: 'Select Color',
  chooseSize: 'Choose your preferred size',
  chooseColor: 'Choose your preferred color',
  whereShouldItGo: 'Where do you want the design?',
  choosePrintLocation: 'Front, back, or both?',
  letsCreate: "Let's Create",
  startDesigning: 'Start Designing',
  viewAllProducts: 'View All Products',
  backToProducts: '← Back to Products',

  // Design flow
  yourCreativeWingmanReady: "Tell us your idea and we'll help you create it",
  wingmanDescription: "Describe your design in words—we'll create the artwork and show it on your tee.",
  brewingMagic: 'Brewing Magic...',
  generating: 'Generating Design...',
  lockItIn: 'Lock It In',
  applyChanges: 'Apply Changes',
  designProgress: 'Your design',
  areasComplete: (completed: number, total: number) => `${completed} of ${total} spots done`,

  // Design editor
  editDesign: 'Edit Design',
  advancedImageEditor: 'Advanced Image Editor',
  aiEdit: 'AI Edit',
  applyAiEdit: 'Apply AI Edit',
  editing: 'Editing...',
  removeBackground: 'Remove Background',
  saveChanges: 'Save Changes',
  resetAll: 'Reset All',

  // Chat / AI
  aiDesignAssistant: 'AI Design Assistant',
  poweredByAI: 'Your design helper',
  chatPlaceholder: 'Describe your design idea...',

  // Design preferences
  howToCreate: 'How would you like to create your design?',
  chooseMethod: 'Choose your preferred method to get started',
  aiDesignGenerator: 'AI Design Generator',
  recommended: 'Recommended',
  aiGeneratorDescription: 'Describe your idea and our AI will create a custom design for you',
  createWithAI: 'Create with AI',
  uploadYourOwn: 'Upload Your Own',
  uploadDescription: 'Already have a design? Upload your image file directly',
  uploadImage: 'Upload Image',
  skipToChat: 'Skip to chat with design assistant',
  quickDesignBrief: 'Quick Design Brief',
  briefDescription: "Tell us about your design idea. Fill in what you know - we'll handle the rest!",
  generateMyDesign: 'Generate My Design',

  // Checkout
  processingOrder: 'Processing Your Order',
  processingOrderDescription: 'Please wait while we process your payment and submit your order to Printful...',
  proceedToCheckout: 'Proceed to Checkout',
  finalizeCheckout: 'Finalize & Checkout',
  publishToCatalog: 'Publish to Catalog',
  manageDesigns: 'Edit or replace designs',
  cart: 'Cart',

  // Design bin
  openDesignManager: 'Edit your designs',
  allAreasComplete: 'All spots done! Ready for checkout.',

  // Misc
  studioView: 'Studio View',
  designYourPerfectTee: 'Design Your Perfect Tee',
  chooseProductPrompt: 'Choose a product and let our AI assistant help you create a custom design.',
  studioGallery: 'Studio Gallery',
  pickBaseTee: 'Pick a base tee to begin your design journey.',
  completeDesignsPrompt: (areas: string) => `Add a design to each spot you chose (${areas}) to continue.`,
  noRefundsNote: 'No refunds or cancellations after order completion',
  generatingYourDesign: 'Generating your design...',
  generateDesign: 'Generate Design',

  // User-facing errors (non-technical)
  errorCopy: {
    generationFailed: "We couldn't create an image right now. Please try again in a moment or try a different description.",
    notConfigured: "Image creation is temporarily unavailable. Please try again later.",
    contentNotApproved: "We couldn't use that description. Please try a different idea.",
    ageVerificationRequired: 'Age verification required to generate this type of content.',
  },

  describeIdeaPrompt: 'Describe your idea in a sentence or two, then click Generate Design.',

  // Simple vs advanced (progressive disclosure)
  moreControlTip: 'Want to layer images or tweak details? Open Edit your designs.',
  editThisDesign: 'Edit this design',
  combineImages: 'Combine images',
  designManagerHelp: 'Use Edit this design to change one design (crop, add text). Use Combine images to put several images together.',
}
