import { ConversationScenario, SpeechAssessment } from '../models';

export const MOCK_SCENARIOS: ConversationScenario[] = [
  {
    id: 'mock-scenario-1',
    name: 'Mock: Ordering Coffee',
    description: 'A mock conversation about ordering a coffee at a café.',
    difficulty_level: 'A2',
    sentences: [
      {
        id: 'mock-s1-1',
        source: {
          text: 'Hello, I would like a large latte, please.',
          highlighted_words: [
            {
              word: 'large',
              translation: 'groß',
              examples: ['I need a large box.', 'This is a very large house.'],
            },
          ],
        },
        target: {
          text: 'Hallo, ich hätte gerne einen großen Latte, bitte.',
          highlighted_words: [
            {
              word: 'gerne',
              translation: 'gladly / with pleasure',
              examples: [
                'Ich trinke gerne Kaffee.',
                'Wir helfen Ihnen gerne.',
              ],
            },
          ],
        },
      },
      {
        id: 'mock-s1-2',
        source: {
          text: 'To have here or to go?',
          highlighted_words: [],
        },
        target: {
          text: 'Zum hier Trinken oder zum Mitnehmen?',
          highlighted_words: [
            {
              word: 'Mitnehmen',
              translation: 'takeaway',
              examples: [
                'Eine Pizza zum Mitnehmen, bitte.',
                'Gibt es das auch zum Mitnehmen?',
              ],
            },
          ],
        },
      },
      {
        id: 'mock-s1-3',
        source: {
          text: 'To go, please. And a croissant as well.',
          highlighted_words: [
            {
              word: 'as well',
              translation: 'auch / ebenfalls',
              examples: [
                'I would like a coffee and a croissant as well.',
                'She speaks French as well.',
              ],
            },
          ],
        },
        target: {
          text: 'Zum Mitnehmen, bitte. Und ein Croissant auch.',
          highlighted_words: [
            {
              word: 'auch',
              translation: 'also / as well',
              examples: ['Ich bin auch müde.', 'Er will auch ein Eis.'],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'mock-scenario-2',
    name: 'Mock: Asking for Directions',
    description: 'A mock conversation where a tourist asks a local for directions to the train station.',
    difficulty_level: 'B1',
    sentences: [
        {
            id: 'mock-s2-1',
            source: {
                text: "Excuse me, could you please tell me how to get to the train station?",
                highlighted_words: [
                    {
                        word: "station",
                        translation: "Bahnhof",
                        examples: ["The train leaves from platform 3.", "I'll meet you at the station."]
                    }
                ]
            },
            target: {
                text: "Entschuldigung, können Sie mir bitte sagen, wie ich zum Bahnhof komme?",
                highlighted_words: [
                    {
                        word: "Bahnhof",
                        translation: "train station",
                        examples: ["Der Zug fährt von Gleis 3 ab.", "Ich treffe dich am Bahnhof."]
                    }
                ]
            }
        },
        {
            id: 'mock-s2-2',
            source: {
                text: "Of course. Go straight ahead and then turn right at the next intersection.",
                highlighted_words: [
                    {
                        word: "intersection",
                        translation: "Kreuzung",
                        examples: ["Be careful at the next intersection.", "The bakery is on the corner of the intersection."]
                    }
                ]
            },
            target: {
                text: "Natürlich. Gehen Sie geradeaus und biegen Sie dann an der nächsten Kreuzung rechts ab.",
                highlighted_words: [
                    {
                        word: "geradeaus",
                        translation: "straight ahead",
                        examples: ["Fahren Sie immer geradeaus.", "Der Weg führt geradeaus durch den Wald."]
                    },
                    {
                        word: "Kreuzung",
                        translation: "intersection",
                        examples: ["Seien Sie an der nächsten Kreuzung vorsichtig.", "Die Bäckerei ist an der Ecke der Kreuzung."]
                    }
                ]
            }
        },
        {
            id: 'mock-s2-3',
            source: {
                text: "Thank you very much for your help!",
                highlighted_words: []
            },
            target: {
                text: "Vielen Dank für Ihre Hilfe!",
                highlighted_words: [
                    {
                        word: "Hilfe",
                        translation: "help",
                        examples: ["Brauchen Sie Hilfe?", "Danke für die schnelle Hilfe."]
                    }
                ]
            }
        }
    ]
  }
];

export const MOCK_ASSESSMENT: SpeechAssessment = {
    overall_feedback: "This is a good attempt! Your pronunciation is generally clear, but focus a bit more on the 'r' sounds.",
    pronunciation_score: 85,
    fluency_score: 90,
    suggestions: [
        "Try to roll your 'r's slightly more.",
        "Your pace is good, keep it up!",
        "Focus on the vowel sound in the word 'Bahnhof'."
    ]
};
