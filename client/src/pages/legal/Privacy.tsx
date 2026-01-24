import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img
                src="/logo.png"
                alt="Angelus"
                className="w-10 h-10 object-contain rounded bg-white/90 p-0.5"
              />
              <span className="font-semibold text-xl">Angelus</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy (GDPR)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold text-base mb-2">General Information</h3>
              <p className="text-muted-foreground">
                The following information provides a simple overview of what happens to your personal data when you visit our website. Personal data is any data that can personally identify you. For detailed information on data protection, please refer to our privacy policy below.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Data Collection on Our Website</h3>
              <p className="text-muted-foreground">
                Data processing on this website is carried out by the website operator. The operator's contact details can be found in the imprint of this website.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">How Do We Collect Your Data?</h3>
              <p className="text-muted-foreground">
                Your data is collected in part by you providing it to us. This may include data that you enter into a contact form, for example. Other data is collected automatically by our IT systems when you visit the website. This is primarily technical data (e.g., internet browser, operating system, or time of page access). This data is collected automatically as soon as you enter our website.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">What Do We Use Your Data For?</h3>
              <p className="text-muted-foreground">
                Part of the data is collected to ensure error-free provision of the website. Other data may be used to analyze your user behavior.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">What Rights Do You Have Regarding Your Data?</h3>
              <p className="text-muted-foreground">
                You have the right at any time to receive free information about the origin, recipient, and purpose of your stored personal data. You also have the right to request the correction, blocking, or deletion of this data. For this and other questions about data protection, you can contact us at any time using the address provided in the imprint. Furthermore, you have the right to lodge a complaint with the competent supervisory authority.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Responsible Party</h3>
              <div className="text-muted-foreground space-y-1">
                <p><strong>Blue Globe Finance, LLC</strong></p>
                <p>Lower Bay Street, Browne's Building 1st Floor, Suite 2131</p>
                <p>Kingstown, St. Vincent and the Grenadines</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">SSL/TLS Encryption</h3>
              <p className="text-muted-foreground">
                This site uses SSL/TLS encryption for security reasons and to protect the transmission of confidential content. You can recognize an encrypted connection by the fact that the browser address bar changes from "http://" to "https://" and by the lock symbol in your browser bar. When SSL/TLS encryption is activated, the data you transmit to us cannot be read by third parties.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Cookies</h3>
              <p className="text-muted-foreground">
                The website uses cookies in some cases. Cookies do not damage your computer and do not contain viruses. Cookies are used to make our website more user-friendly, effective, and secure. Cookies are small text files that are stored on your computer and saved by your browser.
              </p>
              <p className="text-muted-foreground mt-2">
                You can configure your browser to inform you about the setting of cookies and to allow cookies only in individual cases, to exclude the acceptance of cookies for certain cases or generally, and to activate the automatic deletion of cookies when closing the browser.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Withdrawal of Your Consent</h3>
              <p className="text-muted-foreground">
                Many data processing operations are only possible with your express consent. You can revoke consent you have already given at any time. An informal message by email to us is sufficient. The legality of data processing carried out until the revocation remains unaffected by the revocation.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">Information, Blocking, Deletion</h3>
              <p className="text-muted-foreground">
                Within the framework of the applicable legal provisions, you have the right at any time to free information about your stored personal data, its origin and recipients, and the purpose of data processing, and, if applicable, a right to correction, blocking, or deletion of this data. For this and other questions about personal data, you can contact us at any time using the address provided in the imprint.
              </p>
            </div>

            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground">
                Source: <a href="https://kg.angelus.group/datenschutz/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://kg.angelus.group/datenschutz/</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-secondary border-t border-border">
        <div className="container text-center text-sm text-secondary-foreground/60">
          © {new Date().getFullYear()} Blue Globe Finance, LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
