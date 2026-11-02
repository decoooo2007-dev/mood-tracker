import Link from "next/link";
import { notFound } from "next/navigation";

const options = [
  {
    id: 1,
    name: "Serene Gradient Wellness",
    description: "Calming pastel gradients with soft organic shapes, emoji mood selectors, and calendar heatmap",
    gradient: "from-violet-400 via-purple-400 to-pink-400",
    emoji: "🌸",
    href: "/preview/option-1",
  },
  {
    id: 2,
    name: "Dark Mode Zen Garden",
    description: "Meditative dark theme with breathing animations, soft glows, and mindful journaling experience",
    gradient: "from-purple-600 via-indigo-600 to-pink-600",
    emoji: "🌙",
    href: "/preview/option-2",
  },
  {
    id: 3,
    name: "Minimalist Bento Grid",
    description: "Clean bento-box layout with distinct sections, crisp typography, and focused journaling",
    gradient: "from-gray-600 via-gray-500 to-gray-400",
    emoji: "📐",
    href: "/preview/option-3",
  },
  {
    id: 4,
    name: "Playful Animated Journal",
    description: "Vibrant design with bouncy spring animations, confetti celebrations, and achievement badges",
    gradient: "from-orange-400 via-pink-400 to-purple-400",
    emoji: "🎨",
    href: "/preview/option-4",
  },
  {
    id: 5,
    name: "Glassmorphism Dashboard",
    description: "Modern frosted-glass aesthetic with backdrop blur, animated gradient mesh, and premium feel",
    gradient: "from-purple-500 via-blue-500 to-cyan-400",
    emoji: "💎",
    href: "/preview/option-5",
  },
];

export default function PreviewHub() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Mood Tracker Preview
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            5 different design directions for your daily journal app. Click each card to explore.
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {options.map((option, index) => (
            <Link
              key={option.id}
              href={option.href}
              className="group block"
            >
              <div
                className={`relative overflow-hidden bg-gradient-to-br ${option.gradient} rounded-3xl p-6 h-64 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl`}
              >
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 right-4 text-8xl">{option.emoji}</div>
                  <div className="absolute bottom-4 left-4 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-5xl">{option.emoji}</span>
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                      Option {option.id}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-end">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {option.name}
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {option.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-white font-medium">
                      <span>Preview this design</span>
                      <svg
                        className="w-5 h-5 transition-transform group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-3xl" />
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Each design is fully responsive and includes:
            <span className="text-gray-400 mx-2">•</span>
            Mood selection
            <span className="text-gray-400 mx-2">•</span>
            Journal entry
            <span className="text-gray-400 mx-2">•</span>
            Mood trends
            <span className="text-gray-400 mx-2">•</span>
            Entry history
          </p>
        </div>
      </div>
    </div>
  );
}