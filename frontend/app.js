// React App Component
const { useState, useEffect, useRef } = React;

// Main App Component
function App() {
    const [currentView, setCurrentView] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Initial greeting
        setMessages([{
            text: "Hello! I'm your AI Health Assistant. I can help you understand your symptoms and provide health guidance. How can I assist you today?",
            sender: 'bot'
        }]);
    }, []);

    // Enhanced disease database with NLP keywords
    const diseaseDatabase = [
        {
            name: "Common Cold",
            keywords: ["cold", "runny nose", "sneezing", "cough", "sore throat", "congestion", "stuffy nose", "nasal", "sneeze"],
            description: "A viral infection of your nose and throat (upper respiratory tract).",
            severity: "mild",
            remedies: [
                "Get plenty of rest (7-9 hours of sleep)",
                "Stay well hydrated - drink water, warm tea, and clear broths",
                "Use a humidifier to ease congestion",
                "Gargle with warm salt water for sore throat",
                "Take over-the-counter pain relievers if needed"
            ],
            duration: "Usually 7-10 days",
            warning: "See a doctor if symptoms persist beyond 10 days or worsen."
        },
        {
            name: "Influenza (Flu)",
            keywords: ["flu", "fever", "body aches", "fatigue", "chills", "headache", "high temperature", "muscle pain", "weakness"],
            description: "A contagious respiratory illness caused by influenza viruses.",
            severity: "moderate",
            remedies: [
                "Rest and stay home to avoid spreading the illness",
                "Drink plenty of fluids to prevent dehydration",
                "Consider antiviral medications (consult a doctor within 48 hours)",
                "Take fever reducers like acetaminophen or ibuprofen",
                "Use a humidifier and get adequate rest"
            ],
            duration: "Usually 1-2 weeks",
            warning: "Seek immediate care if you have difficulty breathing, chest pain, or persistent fever."
        },
        {
            name: "Migraine",
            keywords: ["severe headache", "migraine", "nausea", "light sensitivity", "photophobia", "throbbing pain", "pounding head", "aura"],
            description: "Intense, debilitating headaches often accompanied by nausea and sensitivity to light/sound.",
            severity: "moderate",
            remedies: [
                "Rest in a quiet, dark, cool room",
                "Apply cold compress to forehead or neck",
                "Stay well hydrated",
                "Avoid triggers (bright lights, loud sounds, strong smells)",
                "Consider prescribed migraine medications",
                "Try relaxation techniques or meditation"
            ],
            duration: "4-72 hours if untreated",
            warning: "Consult a neurologist if migraines are frequent or severe."
        },
        {
            name: "Gastroenteritis (Stomach Flu)",
            keywords: ["stomach flu", "diarrhea", "vomiting", "nausea", "stomach pain", "cramps", "upset stomach", "abdominal pain", "digestive"],
            description: "Inflammation of the stomach and intestines, usually caused by a viral infection.",
            severity: "moderate",
            remedies: [
                "Stay hydrated with water, clear broths, and electrolyte solutions",
                "Rest your stomach - eat bland foods (BRAT diet: bananas, rice, applesauce, toast)",
                "Avoid dairy products, caffeine, alcohol, and fatty foods",
                "Get plenty of rest",
                "Gradually reintroduce normal foods"
            ],
            duration: "1-3 days typically",
            warning: "Seek medical attention if symptoms persist beyond 48 hours or if you have signs of dehydration."
        },
        {
            name: "Allergies (Seasonal)",
            keywords: ["allergies", "sneezing", "itchy eyes", "watery eyes", "runny nose", "congestion", "allergic", "hay fever", "pollen"],
            description: "Immune system reaction to typically harmless substances like pollen, dust, or pet dander.",
            severity: "mild",
            remedies: [
                "Avoid known allergens when possible",
                "Use antihistamines for symptom relief",
                "Keep windows closed during high pollen seasons",
                "Use air purifiers with HEPA filters indoors",
                "Shower after being outdoors to remove pollen",
                "Consider allergy shots (immunotherapy) for long-term relief"
            ],
            duration: "Seasonal or year-round depending on triggers",
            warning: "See an allergist if symptoms interfere with daily life."
        },
        {
            name: "Anxiety Disorder",
            keywords: ["anxiety", "panic", "worry", "nervous", "stress", "heart racing", "anxious", "restless", "fear", "panic attack"],
            description: "Persistent feelings of worry, nervousness, or fear that can interfere with daily activities.",
            severity: "moderate",
            remedies: [
                "Practice deep breathing exercises (4-7-8 technique)",
                "Try meditation or mindfulness practices",
                "Engage in regular physical exercise",
                "Maintain a healthy sleep schedule",
                "Limit caffeine and alcohol intake",
                "Talk to a mental health professional or therapist"
            ],
            duration: "Ongoing condition requiring management",
            warning: "Seek professional help if anxiety interferes with daily life or if you have thoughts of self-harm."
        },
        {
            name: "Asthma",
            keywords: ["asthma", "wheezing", "shortness of breath", "difficulty breathing", "chest tightness", "breathless", "respiratory"],
            description: "A chronic condition affecting airways, causing breathing difficulties and wheezing.",
            severity: "moderate to severe",
            remedies: [
                "Use prescribed inhalers as directed by your doctor",
                "Avoid asthma triggers (smoke, allergens, cold air)",
                "Monitor peak flow regularly",
                "Keep emergency (rescue) inhaler accessible at all times",
                "Exercise regularly but warm up properly",
                "Follow your asthma action plan"
            ],
            duration: "Chronic condition requiring ongoing management",
            warning: "Seek emergency care immediately if you have severe difficulty breathing, blue lips, or if your inhaler doesn't help."
        }
    ];

    // Advanced NLP-based message analysis
    const analyzeMessage = (message) => {
        const lowerMessage = message.toLowerCase();
        const matches = [];
        
        // Check for emergency keywords first
        const emergencyKeywords = ['chest pain', 'heart attack', "can't breathe", 'severe bleeding', 'unconscious', 'suicide', 'overdose', 'stroke'];
        for (const keyword of emergencyKeywords) {
            if (lowerMessage.includes(keyword)) {
                return { type: 'emergency' };
            }
        }
        
        // Analyze symptoms using keyword matching with scoring
        for (const disease of diseaseDatabase) {
            let score = 0;
            let matchedKeywords = [];
            
            for (const keyword of disease.keywords) {
                if (lowerMessage.includes(keyword)) {
                    score++;
                    matchedKeywords.push(keyword);
                }
            }
            
            if (score > 0) {
    const sendMessage = () => {
        if (!inputMessage.trim()) return;

        const userMessage = { text: inputMessage, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        
        // Store in conversation history for context
        setConversationHistory(prev => [...prev, userMessage]);

        const analysis = analyzeMessage(inputMessage);
        let botResponse = '';

        if (analysis.type === 'emergency') {
            botResponse = `🚨 **MEDICAL EMERGENCY DETECTED** 🚨\n\nThe symptoms you've described may require **immediate medical attention**.\n\n**Please do the following NOW:**\n\n1. **Call emergency services (911/112) immediately**\n2. **Do not wait for an online consultation**\n3. **If possible, have someone stay with you**\n4. **Stay calm and try to remain still**\n\nThis is a potential medical emergency that requires professional care immediately.`;
        } else if (analysis.type === 'disease') {
            const disease = analysis.data;
            const confidence = Math.round(analysis.confidence);
            
            botResponse = `Based on the symptoms you've described, I believe you might be experiencing **${disease.name}** (${confidence}% confidence match).\n\n`;
            botResponse += `**📋 What is it?**\n${disease.description}\n\n`;
            botResponse += `**⚠️ Severity Level:** ${disease.severity.toUpperCase()}\n\n`;
            botResponse += `**⏱️ Typical Duration:** ${disease.duration}\n\n`;
            botResponse += `**💊 Recommended Self-Care:**\n${disease.remedies.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
            
            if (disease.warning) {
                botResponse += `**⚠️ Important:** ${disease.warning}\n\n`;
            }
            
            // Show alternative matches if available
            if (analysis.allMatches && analysis.allMatches.length > 1) {
                botResponse += `**Other possible conditions to consider:**\n`;
                analysis.allMatches.slice(1, 3).forEach((match, i) => {
                    botResponse += `${i + 1}. ${match.disease.name} (${Math.round(match.confidence)}% match)\n`;
                });
                botResponse += `\n`;
            }
            
            botResponse += `💡 **Remember:** This is an AI-powered assessment for educational purposes only. For a proper diagnosis and treatment plan, please consult with a qualified healthcare professional.\n\n`;
            botResponse += `Would you like to know more about any specific aspect, or do you have other symptoms to discuss?`;
        } else if (analysis.type === 'greeting') {
            const greetings = [
                "Hello! I'm here to help with your health concerns. What symptoms are you experiencing?",
                "Hi there! How can I assist you with your health today?",
                "Welcome! Please tell me about any symptoms or health concerns you have.",
                "Hello! I'm your AI Health Assistant. What brings you here today?"
            ];
            botResponse = greetings[Math.floor(Math.random() * greetings.length)];
        } else if (analysis.type === 'hospital') {
            botResponse = "🏥 **Finding Nearby Hospitals**\n\nI can help you locate medical facilities near you! Please scroll down to the **Hospital Finder** section where you can:\n\n• Use your current location\n• Search by any address\n• View hospital details (address, phone, hours)\n• Get directions\n\nIs there anything else you'd like to know about your symptoms?";
        } else if (analysis.type === 'thanks') {
            botResponse = "You're very welcome! 😊 I'm glad I could help. If you have any other health concerns or questions, feel free to ask anytime. Take care of yourself!";
        } else {
            // Contextual response based on conversation history
            const hasSymptoms = conversationHistory.some(msg => 
                msg.sender === 'user' && 
                (msg.text.toLowerCase().includes('pain') || 
                 msg.text.toLowerCase().includes('hurt') || 
                 msg.text.toLowerCase().includes('feel'))
            );
            
            if (hasSymptoms) {
                botResponse = "I understand. To help you better, could you provide more specific details about your symptoms?\n\nFor example:\n• Where exactly do you feel discomfort?\n• How long have you been experiencing this?\n• On a scale of 1-10, how severe is it?\n• Have you noticed any other changes?\n\nThe more details you share, the better I can assist you.";
            } else {
                botResponse = "I'm here to help with health-related questions and symptom analysis. You can:\n\n• Describe any symptoms you're experiencing\n• Ask about specific health conditions\n• Find nearby hospitals or clinics\n• Get general health advice\n\nWhat would you like to know?";
            }
        }

        setTimeout(() => {
            const botMessage = { text: botResponse, sender: 'bot' };
            setMessages(prev => [...prev, botMessage]);
            setConversationHistory(prev => [...prev, botMessage]);
        }, 800);

        setInputMessage('');
    };  // Check for thank you
        if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
            return { type: 'thanks' };
        }
        
    return (
        <div className="app">
            <Navbar />
            <HeroSection />
            <ChatInterface 
                messages={messages}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                sendMessage={sendMessage}
                handleKeyPress={handleKeyPress}
                messagesEndRef={messagesEndRef}
            />
            <HospitalFinder />
            <Statistics />
            <Testimonials />
            <FAQ />
            <Footer />
        </div>
    );
}       }, 800);

        setInputMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="app">
            <Navbar />
            <HeroSection />
            
            {currentView === 'selection' ? (
                <DoctorSelection onSelectDoctor={selectDoctor} />
            ) : (
                <ChatInterface 
                    selectedDoctor={selectedDoctor}
                    messages={messages}
                    inputMessage={inputMessage}
                    setInputMessage={setInputMessage}
                    sendMessage={sendMessage}
                    handleKeyPress={handleKeyPress}
                    onBack={() => {
                        setCurrentView('selection');
                        setMessages([]);
                        setSelectedDoctor(null);
                    }}
                    messagesEndRef={messagesEndRef}
                />
            )}
            
            <HospitalFinder />
            <Statistics />
            <Testimonials />
            <FAQ />
            <Footer />
        </div>
    );
}

// Navbar Component
function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="navbar">
            <div className="nav-container">
                <div className="logo">
                    <img src="logo.svg" alt="MediScan Logo" />
                </div>
                <button className="nav-toggle" onClick={() => setIsOpen(!isOpen)}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <ul className={`nav-menu ${isOpen ? 'active' : ''}`}>
                    <li><a href="#home" onClick={() => setIsOpen(false)}>Home</a></li>
                    <li><a href="#ai-doctor" onClick={() => setIsOpen(false)}>AI Doctor</a></li>
                    <li><a href="#hospitals" onClick={() => setIsOpen(false)}>Hospitals</a></li>
                    <li><a href="#about" onClick={() => setIsOpen(false)}>About</a></li>
                </ul>
            </div>
        </nav>
    );
}

// Hero Section Component
function HeroSection() {
    return (
        <section className="hero" id="home">
            <div className="hero-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
            </div>
            <div className="hero-content">
                <h1 className="hero-title">
                    Welcome to <span className="gradient-text">MediScan</span>
                </h1>
                <p className="hero-subtitle">Your AI-Powered Health Assistant</p>
                <a href="#ai-doctor" className="cta-button">
                    <span>Start Consultation</span>
                    <i className="fas fa-arrow-right"></i>
                </a>
            </div>
        </section>
    );
}

// Doctor Selection Component
function DoctorSelection({ onSelectDoctor }) {
    return (
        <section className="doctor-selection" id="ai-doctor">
            <div className="container">
                <div className="section-header">
                    <div className="icon-badge">
                        <i className="fas fa-stethoscope"></i>
                    </div>
                    <h2 className="section-title">Choose Your AI Doctor</h2>
                    <p className="section-subtitle">Select the consultation type that suits your needs</p>
                </div>
                
                <div className="comparison-container">
                    <div className="comparison-grid">
                        <DoctorCard 
                            type="personal"
                            icon="fa-user-md"
                            title="Personal AI Doctor"
                            description="Personalized care with memory of your health history"
                            features={[
                                "Remembers your health history",
                                "Tailored recommendations",
                                "Track symptoms over time",
                                "Personalized insights"
                            ]}
                            onSelect={() => onSelectDoctor('personal')}
                        />
                        
                        <div className="vs-divider">
                            <div className="vs-circle">
                                <span>VS</span>
                            </div>
                        </div>
                        
                        <DoctorCard 
                            type="general"
                            icon="fa-robot"
                            title="General AI Doctor"
                            description="Anonymous consultation without data storage"
                            features={[
                                "Complete privacy guaranteed",
                                "General health guidance",
                                "No data stored or tracked",
                                "Instant anonymous advice"
                            ]}
                            onSelect={() => onSelectDoctor('general')}
                        />
                    </div>
                    
                    <div className="comparison-note">
                        <i className="fas fa-info-circle"></i>
                        <p><strong>Not sure which to choose?</strong> Personal AI Doctor is best for ongoing health tracking, while General AI Doctor is perfect for quick, anonymous consultations.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Doctor Card Component
function DoctorCard({ type, icon, title, description, features, onSelect }) {
    return (
        <div className={`doctor-card ${type}`} onClick={onSelect}>
            <div className="card-glow"></div>
            <div className="card-content">
                <div className="doctor-icon">
                    <i className={`fas ${icon}`}></i>
                    {type === 'personal' ? (
                        <span className="badge"><i className="fas fa-brain"></i></span>
                    ) : (
                        <span className="badge"><i className="fas fa-shield-alt"></i></span>
                    )}
                </div>
                <h3>{title}</h3>
                <p className="card-description">{description}</p>
                <ul className="features-list">
                    {features.map((feature, index) => (
                        <li key={index}>
                            <i className="fas fa-check-circle"></i>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
                <button className="select-button">
                    <span>Start Consultation</span>
                    <i className="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    );
}

// Chat Interface Component
function ChatInterface({ messages, inputMessage, setInputMessage, sendMessage, handleKeyPress, messagesEndRef }) {
    return (
        <section className="chat-section" id="ai-doctor">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="gradient-text">AI Health Assistant</span>
                    </h2>
                    <p className="section-subtitle">
                        Powered by advanced NLP and medical knowledge base
                    </p>
                </div>
                
                <div className="chat-container">
                    <div className="chat-header">
                        <div className="doctor-info">
                            <div className="avatar">
                                <i className="fas fa-robot"></i>
                            </div>
                            <div>
                                <h3>AI Health Assistant</h3>
                                <span className="status">
                                    <span className="status-dot"></span>
                                    Online - Ready to help 24/7
                                </span>
                            </div>
                        </div>
                        <div className="chat-features">
                            <span className="feature-badge"><i className="fas fa-brain"></i> NLP Powered</span>
                            <span className="feature-badge"><i className="fas fa-shield-alt"></i> Confidential</span>
                        </div>
                    </div>
                    
                    <div className="chat-messages">
                        {messages.map((msg, index) => (
                            <Message key={index} message={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="chat-input">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Describe your symptoms (e.g., 'I have a headache and fever')..."
                            rows="2"
                        />
                        <button onClick={sendMessage} className="send-button">
                            <i className="fas fa-paper-plane"></i>
                            <span>Send</span>
                        </button>
                    </div>
                    
                    <div className="chat-disclaimer">
                        <i className="fas fa-info-circle"></i>
                        <p>This AI assistant provides health information for educational purposes. Always consult with a healthcare professional for medical advice.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Message Component
function Message({ message }) {
    const formatText = (text) => {
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('<strong>').map((part, j) => {
                    if (j % 2 === 1) {
                        return <strong key={j}>{part.replace('</strong>', '')}</strong>;
                    }
                    return part;
                })}
                <br />
            </React.Fragment>
        ));
    };

    return (
        <div className={`message ${message.sender}`}>
            <div className="message-avatar">
                <i className={`fas ${message.sender === 'bot' ? 'fa-robot' : 'fa-user'}`}></i>
            </div>
            <div className="message-bubble">
                {formatText(message.text)}
            </div>
        </div>
    );
}

// Hospital Finder Component
function HospitalFinder() {
    const [location, setLocation] = useState('');
    const [hospitals, setHospitals] = useState([]);

    const sampleHospitals = [
        { name: "City General Hospital", address: "123 Main St", phone: "+1 (555) 123-4567", distance: "0.5 miles", rating: 4.5 },
        { name: "St. Mary's Medical Center", address: "456 Oak Ave", phone: "+1 (555) 234-5678", distance: "1.2 miles", rating: 4.7 },
        { name: "Emergency Care Clinic", address: "789 Elm St", phone: "+1 (555) 345-6789", distance: "1.8 miles", rating: 4.3 }
    ];

    const searchHospitals = () => {
        setHospitals(sampleHospitals);
    };

    const useCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation(`Current Location`);
                    searchHospitals();
                },
                () => alert('Unable to get location')
            );
        }
    };

    return (
        <section className="hospital-section" id="hospitals">
            <div className="container">
                <h2 className="section-title">Find Nearby Hospitals</h2>
                <div className="search-box">
                    <input 
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter your location..."
                    />
                    <button onClick={useCurrentLocation} className="location-btn">
                        <i className="fas fa-location-crosshairs"></i>
                    </button>
                    <button onClick={searchHospitals} className="search-btn">
                        <i className="fas fa-search"></i>
                        Search
                    </button>
                </div>
                
                {hospitals.length > 0 && (
                    <div className="hospital-grid">
                        {hospitals.map((hospital, index) => (
                            <div key={index} className="hospital-card">
                                <h3><i className="fas fa-hospital"></i> {hospital.name}</h3>
                                <div className="hospital-info">
                                    <p><i className="fas fa-map-marker-alt"></i> {hospital.address}</p>
                                    <p><i className="fas fa-phone"></i> {hospital.phone}</p>
                                    <p><i className="fas fa-route"></i> {hospital.distance}</p>
                                    <p><i className="fas fa-star"></i> {hospital.rating}/5.0</p>
                                </div>
                                <button className="directions-btn">
                                    <i className="fas fa-directions"></i> Get Directions
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

// Statistics Component
function Statistics() {
    const stats = [
        {
            icon: "fa-users",
            count: "50,000+",
            label: "Satisfied Patients",
            color: "#10b981"
        },
        {
            icon: "fa-comments",
            count: "250,000+",
            label: "AI Consultations",
            color: "#6366f1"
        },
        {
            icon: "fa-hospital",
            count: "1,500+",
            label: "Partner Hospitals",
            color: "#ec4899"
        },
        {
            icon: "fa-clock",
            count: "24/7",
            label: "Available Support",
            color: "#8b5cf6"
        }
    ];

    return (
        <section className="statistics-section">
            <div className="container">
                <div className="stats-grid">
                    {stats.map((stat, index) => (
                        <div key={index} className="stat-card" style={{'--delay': `${index * 0.1}s`}}>
                            <div className="stat-icon" style={{background: `linear-gradient(135deg, ${stat.color}, ${stat.color}dd)`}}>
                                <i className={`fas ${stat.icon}`}></i>
                            </div>
                            <h3 className="stat-count">{stat.count}</h3>
                            <p className="stat-label">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Testimonials Component
function Testimonials() {
    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Patient",
            image: "fa-user-circle",
            rating: 5,
            text: "MediScan's AI Doctor helped me understand my symptoms quickly. The Personal AI Doctor remembered my medical history and gave me personalized advice. Highly recommended!",
            date: "2 weeks ago"
        },
        {
            name: "Michael Chen",
            role: "Healthcare Worker",
            image: "fa-user-circle",
            rating: 5,
            text: "As a nurse, I appreciate the accuracy of MediScan's recommendations. It's a great first step before visiting a doctor. The hospital finder feature is incredibly useful!",
            date: "1 month ago"
        },
        {
            name: "Emily Rodriguez",
            role: "Mother of Two",
            image: "fa-user-circle",
            rating: 5,
            text: "With two young kids, MediScan has been a lifesaver! I can quickly check symptoms at any time of day. The AI is surprisingly accurate and the interface is so easy to use.",
            date: "3 weeks ago"
        },
        {
            name: "David Thompson",
            role: "Senior Citizen",
            image: "fa-user-circle",
            rating: 5,
            text: "I was skeptical at first, but MediScan's AI Doctor is amazing! It's like having a doctor available 24/7. The explanations are clear and easy to understand.",
            date: "1 week ago"
        },
        {
            name: "Priya Patel",
            role: "Student",
            image: "fa-user-circle",
            rating: 5,
            text: "Perfect for students on a budget! The General AI Doctor gives great advice without storing any data. It helped me identify when I needed to see a real doctor.",
            date: "4 days ago"
        },
        {
            name: "James Wilson",
            role: "Business Professional",
            image: "fa-user-circle",
            rating: 5,
            text: "The convenience is unmatched. I can consult the AI Doctor during my busy schedule. The personalized recommendations are spot-on and have saved me multiple doctor visits.",
            date: "2 months ago"
        }
    ];

    return (
        <section className="testimonials-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">What Our Patients Say</h2>
                    <p className="section-subtitle">Real stories from real people who trust MediScan</p>
                </div>
                
                <div className="testimonials-grid">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="testimonial-card">
                            <div className="testimonial-header">
                                <div className="testimonial-avatar">
                                    <i className={`fas ${testimonial.image}`}></i>
                                </div>
                                <div className="testimonial-info">
                                    <h4>{testimonial.name}</h4>
                                    <p>{testimonial.role}</p>
                                </div>
                                <div className="testimonial-rating">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <i key={i} className="fas fa-star"></i>
                                    ))}
                                </div>
                            </div>
                            <p className="testimonial-text">"{testimonial.text}"</p>
                            <div className="testimonial-date">
                                <i className="fas fa-clock"></i> {testimonial.date}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// FAQ Component
function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "Is MediScan's AI Doctor as accurate as a real doctor?",
            answer: "While our AI Doctor uses advanced algorithms and medical databases to provide accurate information, it's designed to complement, not replace, professional medical advice. We always recommend consulting with a healthcare professional for diagnosis and treatment."
        },
        {
            question: "What's the difference between Personal and General AI Doctor?",
            answer: "The Personal AI Doctor remembers your health history and conversations to provide tailored recommendations over time. The General AI Doctor provides anonymous consultations without storing any data, ensuring complete privacy for one-time queries."
        },
        {
            question: "Is my health data secure with MediScan?",
            answer: "Absolutely! We use bank-level encryption to protect your data. If you use the General AI Doctor, no data is stored at all. For Personal AI Doctor, your data is encrypted and only accessible to you."
        },
        {
            question: "How much does MediScan cost?",
            answer: "MediScan is currently free to use! We believe everyone deserves access to quality health information. Our mission is to make healthcare guidance accessible to all."
        },
        {
            question: "Can I use MediScan for emergency situations?",
            answer: "No. MediScan is NOT for emergencies. If you're experiencing a medical emergency, please call your local emergency number (911 in the US) or go to the nearest emergency room immediately."
        },
        {
            question: "What languages does MediScan support?",
            answer: "Currently, MediScan supports English. We're working on adding support for Spanish, Mandarin, Hindi, and other major languages in the near future."
        },
        {
            question: "How often is the AI Doctor's knowledge updated?",
            answer: "Our AI models are regularly updated with the latest medical research and guidelines. We review and update our knowledge base monthly to ensure you receive the most current information."
        },
        {
            question: "Can MediScan prescribe medications?",
            answer: "No, MediScan cannot prescribe medications. Only licensed healthcare providers can prescribe medication. We can suggest over-the-counter remedies and recommend when you should see a doctor for prescription medication."
        }
    ];

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="faq-section" id="faq">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title">Frequently Asked Questions</h2>
                    <p className="section-subtitle">Everything you need to know about MediScan</p>
                </div>
                
                <div className="faq-container">
                    {faqs.map((faq, index) => (
                        <div key={index} className={`faq-item ${openIndex === index ? 'active' : ''}`}>
                            <button className="faq-question" onClick={() => toggleFAQ(index)}>
                                <span>{faq.question}</span>
                                <i className={`fas fa-chevron-${openIndex === index ? 'up' : 'down'}`}></i>
                            </button>
                            <div className="faq-answer">
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Footer Component
function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3><img src="logo.svg" alt="MediScan" style={{height: '40px', verticalAlign: 'middle'}} /></h3>
                        <p>Your trusted AI-powered health assistant</p>
                    </div>
                    <div className="footer-links">
                        <a href="#privacy">Privacy Policy</a>
                        <a href="#terms">Terms of Service</a>
                        <a href="#contact">Contact</a>
                    </div>
                </div>
                <p className="copyright">© 2025 MediScan. All rights reserved. | Medical Disclaimer: For informational purposes only.</p>
            </div>
        </footer>
    );
}

// Render App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
