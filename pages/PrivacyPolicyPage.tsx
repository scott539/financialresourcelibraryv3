import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="prose max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-slate tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-lg text-gray-500">Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="p-4 mb-8 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
            <p className="font-bold">Important Disclaimer:</p>
            <p>This document is a template and does not constitute legal advice. You must consult with a qualified legal professional to ensure this policy is complete and compliant for your specific business needs, location, and data practices.</p>
          </div>

          <h2>1. Introduction</h2>
          <p>Welcome to BiggerPockets Money ("we," "us," "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Financial Resource Library (the "Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

          <h2>2. Information We Collect</h2>
          <p>We collect information that you provide directly to us when you request to download a resource. The types of personal information we may collect include:</p>
          <ul>
            <li><strong>Contact Information:</strong> Your first name and email address.</li>
            <li><strong>Consent Records:</strong> A record of your consent to join our email list and agree to this Privacy Policy.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for various purposes, including:</p>
          <ul>
            <li><strong>To Provide and Manage the Service:</strong> To process your request and provide you with access to the downloadable resources.</li>
            <li><strong>To Communicate with You:</strong> To send you transactional emails, such as a confirmation of your download.</li>
            <li><strong>For Marketing and Promotional Purposes:</strong> By providing your email address and checking the consent box, you explicitly agree that we may use your email address to send you marketing communications. This includes, but is not limited to, newsletters, promotional offers, product updates, and information about other products and services from BiggerPockets Money and our trusted affiliates. You may opt-out of receiving these communications at any time.</li>
            <li><strong>To Improve Our Services:</strong> To analyze usage and trends to improve the user experience.</li>
          </ul>

          <h2>4. Sharing of Your Information</h2>
          <p>We do not sell your personal information. We may share your information in the following situations:</p>
          <ul>
            <li><strong>With Service Providers:</strong> We may share your information with third-party vendors and service providers that perform services for us, such as email marketing platforms (e.g., ConvertKit, Mailchimp) to manage our mailing lists.</li>
            <li><strong>For Legal Reasons:</strong> We may disclose your information if we are required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).</li>
          </ul>
          
          <h2>5. Your Rights and Choices</h2>
          <p>You have certain rights regarding your personal information, subject to local data protection laws. These rights include:</p>
          <ul>
            <li><strong>Opt-Out of Marketing Communications:</strong> You can unsubscribe from our marketing email list at any time by clicking on the "unsubscribe" link provided in every email we send.</li>
            <li><strong>Access, Correction, and Deletion:</strong> You have the right to request access to, correct, or delete your personal information that we hold. To make such a request, please contact us using the contact details below.</li>
            <li><strong>Rights for European Residents (GDPR):</strong> If you are a resident of the European Economic Area (EEA), you have certain data protection rights, including the right to data portability and the right to object to processing.</li>
            <li><strong>Rights for California Residents (CCPA):</strong> If you are a California resident, you have the right to know what personal information we collect, use, and disclose.</li>
          </ul>

          <h2>6. Data Security</h2>
          <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>

          <h2>7. Data Retention</h2>
          <p>We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy, including for the purposes of satisfying any legal, accounting, or reporting requirements.</p>

          <h2>8. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. We encourage you to review this Privacy Policy periodically for any changes.</p>
          
          <h2>9. Contact Us</h2>
          <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
          <p>BiggerPockets Money<br />
          Email: privacy@biggerpockets.com<br />
          Website: <a href="http://BiggerPocketsMoney.com/Privacy" target="_blank" rel="noopener noreferrer">BiggerPocketsMoney.com/Privacy</a></p>

          <div className="text-center mt-12">
            <Link to="/" className="text-primary hover:text-primary-dark font-semibold">
              &larr; Back to Resources
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
