import { LegalLayout } from "@/components/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — NicheSpy",
  description: "The terms that govern your use of NicheSpy.",
};

const UPDATED = "June 2025";
const SUPPORT_EMAIL = "support@vixo.live";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the NicheSpy website and,
        once available, the NicheSpy product (&quot;Service&quot;). By using the Service or joining the
        waitlist, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        NicheSpy is a competitor-intelligence tool for YouTube creators. It helps you discover competitor
        channels, identify over-performing (outlier) videos, find content gaps, and monitor your niche —
        using publicly available information. The Service is currently in a pre-launch / waitlist phase, and
        features described on the site may change before release.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old (or the age of digital consent in your country) to use the
        Service. By using it, you confirm you meet this requirement.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose or in violation of YouTube&apos;s or any third party&apos;s terms.</li>
        <li>Attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the Service.</li>
        <li>Resell, scrape, or redistribute the Service&apos;s data or output without permission.</li>
        <li>Misrepresent your identity or abuse the waitlist or any communication channels.</li>
      </ul>

      <h2>4. Waitlist &amp; early access</h2>
      <p>
        Joining the waitlist does not guarantee access at any specific time or at all. We may roll out access
        in batches, change planned features, or adjust pricing before launch. Early-access perks are offered
        at our discretion.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The NicheSpy name, logo, website, and software are owned by us and protected by applicable laws. You
        may not copy, modify, or create derivative works from the Service except as expressly permitted.
      </p>

      <h2>6. Third-party data</h2>
      <p>
        NicheSpy surfaces publicly available information about YouTube channels and videos. We are not
        affiliated with, endorsed by, or sponsored by YouTube or Google. All trademarks belong to their
        respective owners.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The Service is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>
        without warranties of any kind. We do not guarantee that insights, metrics, or recommendations will
        produce any particular result for your channel.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, NicheSpy and its operators will not be liable for any
        indirect, incidental, or consequential damages arising from your use of the Service.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate access to the Service at any time if you violate these Terms or to
        protect the Service. You may stop using the Service and leave the waitlist at any time.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms periodically. Continued use of the Service after changes means you accept
        the updated Terms. The &quot;Last updated&quot; date above reflects the latest version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these Terms? Email us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
