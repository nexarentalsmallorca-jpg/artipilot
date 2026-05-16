export const chatBackgroundMessages = [
  {
    type: "customer",
    text: "Hi, are you open today?",
  },
  {
    type: "ai",
    text: "Yes, we are open. I can help you right now.",
  },
  {
    type: "customer",
    text: "How much does it cost?",
  },
  {
    type: "ai",
    text: "Here are the prices, options, and what is included.",
  },
  {
    type: "customer",
    text: "Can I book for tomorrow?",
  },
  {
    type: "ai",
    text: "Sure. I’ll collect the details and notify the team.",
  },
  {
    type: "customer",
    text: "Do you have availability?",
  },
  {
    type: "ai",
    text: "Yes. What date and time works best for you?",
  },
  {
    type: "customer",
    text: "Can I speak with a person?",
  },
  {
    type: "ai",
    text: "Of course. I’ll keep the chat ready for the team.",
  },
  {
    type: "customer",
    text: "Do you accept card payment?",
  },
  {
    type: "ai",
    text: "Yes. I can explain the payment options clearly.",
  },
];

export const liveDemoChats = [
  {
    niche: "Restaurant",
    customer: "Hi, can I book a table for 4 tonight?",
    ai: "Yes. What time would you like to come, and do you prefer inside or terrace seating?",
  },
  {
    niche: "Rental",
    customer: "Do you have scooters available tomorrow?",
    ai: "Yes. Please tell me your pickup time, rental duration, and license type. I’ll prepare the booking details.",
  },
  {
    niche: "Real Estate",
    customer: "I want to buy a property in Mallorca.",
    ai: "Perfect. What is your budget, preferred area, and are you buying for investment, holiday use, or living?",
  },
  {
    niche: "Clinic",
    customer: "Can I book an appointment this week?",
    ai: "Sure. Which service do you need, and what day or time works best for you?",
  },
  {
    niche: "Service Business",
    customer: "Can someone give me a quote?",
    ai: "Yes. Please send the details, location, and preferred date. I’ll collect everything for the team.",
  },
  {
    niche: "Hotel",
    customer: "What time is check-in?",
    ai: "Check-in starts at the scheduled time. I can also help with parking, breakfast, and room questions.",
  },
];

export const pricingPlans = [
  {
    name: "Starter",
    price: "€19",
    description:
      "For small businesses that want a smarter WhatsApp inbox with AI support.",
    features: [
      "€1 for the first month",
      "AI suggested replies",
      "Approve before sending",
      "Business FAQ setup",
      "Simple WhatsApp inbox",
      "Human takeover anytime",
      "Cancel anytime",
    ],
  },
  {
    name: "Growth",
    price: "€49",
    description:
      "The best choice for businesses that want automatic replies and lead capture.",
    features: [
      "€1 for the first month",
      "Automatic AI replies",
      "Lead details collection",
      "Human takeover anytime",
      "Conversation history",
      "Mobile-friendly dashboard",
      "Best for daily WhatsApp enquiries",
    ],
    popular: true,
  },
  {
    name: "Business",
    price: "€69",
    description:
      "For teams that need higher limits, stronger AI instructions, and more control.",
    features: [
      "€1 for the first month",
      "Higher message limits",
      "Advanced AI instructions",
      "Priority support",
      "Team-ready dashboard",
      "Better control for busy inboxes",
      "Built for growing businesses",
    ],
  },
];

export const testimonials = [
  {
    name: "Rental business owner",
    business: "Vehicle rental company",
    quote:
      "Customers get replies instantly. My team only needs to handle the important conversations.",
  },
  {
    name: "Restaurant manager",
    business: "Restaurant & cafe",
    quote:
      "Artipilot answers reservations, opening hours, and menu questions without stress.",
  },
  {
    name: "Local service company",
    business: "Repair & service business",
    quote:
      "Leads are collected properly, and our WhatsApp feels much more organized.",
  },
  {
    name: "Hotel reception team",
    business: "Hotel & guest support",
    quote:
      "It helps answer repetitive guest questions before the team even opens the chat.",
  },
  {
    name: "Real estate agent",
    business: "Property agency",
    quote:
      "The AI asks the right questions and filters serious buyers before we reply manually.",
  },
  {
    name: "Clinic owner",
    business: "Appointments & services",
    quote:
      "It makes booking requests easier and keeps the conversation clean for our staff.",
  },
  {
    name: "Sales team lead",
    business: "Online sales",
    quote:
      "The best part is that customers are never left waiting for a first response.",
  },
  {
    name: "Agency founder",
    business: "Digital agency",
    quote:
      "Simple setup, clear replies, and a much better WhatsApp experience for clients.",
  },
];

export const salesPoints = [
  {
    title: "No stress",
    text: "Artipilot answers repetitive WhatsApp questions instantly.",
  },
  {
    title: "More leads",
    text: "It collects customer details before your team steps in.",
  },
  {
    title: "Full control",
    text: "Switch from AI to human takeover whenever needed.",
  },
];

/*
  This export fixes the build error:

  components/landing/ModelsSection.tsx
  import { models } from "@/lib/landingData";

  Keep this name as "models" unless you also change the import.
*/

export const models = [
  {
    name: "Restaurant AI",
    label: "Restaurant",
    niche: "Restaurants & cafés",
    status: "Popular",
    title: "Handles table bookings and common questions.",
    description:
      "Answers opening hours, menu questions, reservations, takeaway requests and group booking enquiries.",
    customer: "Can I book a table for 4 tonight?",
    ai: "Of course. What time would you like to come, and do you prefer inside or terrace seating?",
    features: ["Reservations", "Menu questions", "Opening hours"],
  },
  {
    name: "Rental AI",
    label: "Rental",
    niche: "Rental businesses",
    status: "Best for bookings",
    title: "Collects booking details before your team replies.",
    description:
      "Answers prices, availability, deposits, documents, insurance, pickup times and rental conditions.",
    customer: "Do you have scooters available tomorrow?",
    ai: "Yes. Please tell me your pickup time, rental duration, vehicle type and license details.",
    features: ["Bookings", "Prices", "Availability"],
  },
  {
    name: "Hotel AI",
    label: "Hotel",
    niche: "Hotels & guest support",
    status: "Guest support",
    title: "Replies instantly to guest questions.",
    description:
      "Helps with check-in, check-out, parking, breakfast, facilities, location and special requests.",
    customer: "What time is check-in?",
    ai: "Check-in starts at the scheduled time. I can also help with parking, breakfast and room questions.",
    features: ["Guest support", "Facilities", "Check-in"],
  },
  {
    name: "Clinic AI",
    label: "Clinic",
    niche: "Clinics & appointments",
    status: "Appointments",
    title: "Collects appointment requests clearly.",
    description:
      "Answers service questions and collects appointment details before sending them to the team.",
    customer: "Can I book an appointment this week?",
    ai: "Sure. Which service do you need, and what day or time works best for you?",
    features: ["Appointments", "Services", "Follow-up"],
  },
  {
    name: "Real Estate AI",
    label: "Real Estate",
    niche: "Property agencies",
    status: "Lead filter",
    title: "Filters serious buyers and rental leads.",
    description:
      "Collects budget, preferred area, property type, timing and viewing requests before the agent replies.",
    customer: "I want to buy a property in Mallorca.",
    ai: "Perfect. What is your budget, preferred area, and are you buying for living, holiday use or investment?",
    features: ["Buyer leads", "Viewings", "Budget filters"],
  },
  {
    name: "Service AI",
    label: "Service",
    niche: "Local service businesses",
    status: "Quotes",
    title: "Turns WhatsApp enquiries into clean leads.",
    description:
      "Collects customer details, service type, location, preferred time and request information.",
    customer: "Can someone give me a quote?",
    ai: "Yes. Please send the details, location and preferred date. I’ll collect everything for the team.",
    features: ["Lead capture", "Quotes", "Customer support"],
  },
];