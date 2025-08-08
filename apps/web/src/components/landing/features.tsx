import { 
  Shield, 
  Zap, 
  Users, 
  Key, 
  Smartphone, 
  Globe, 
  Lock, 
  Settings,
  BarChart
} from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Multi-factor authentication, passkeys, and advanced security features out of the box."
  },
  {
    icon: Zap,
    title: "Lightning Fast Setup",
    description: "Get started in minutes with our simple configuration and extensive documentation."
  },
  {
    icon: Users,
    title: "Multi-tenancy",
    description: "Built-in organization and team management with role-based access control."
  },
  {
    icon: Key,
    title: "Multiple Auth Methods",
    description: "Email/password, OAuth, magic links, passkeys, and SMS authentication."
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "React Native support with Expo integration for seamless mobile authentication."
  },
  {
    icon: Globe,
    title: "OAuth Providers",
    description: "Pre-configured support for Google, GitHub, Discord, Facebook, and custom providers."
  },
  {
    icon: Lock,
    title: "Session Management",
    description: "Advanced session handling with multi-device support and security controls."
  },
  {
    icon: Settings,
    title: "Customizable",
    description: "Full branding customization and extensible plugin architecture."
  },
  {
    icon: BarChart,
    title: "Analytics & Insights",
    description: "Built-in analytics and audit logging for compliance and monitoring."
  }
]

export function Features() {
  return (
    <section className="py-20 bg-muted/20">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need for authentication
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive authentication platform with enterprise features and developer experience in mind.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border bg-background card-hover"
            >
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}