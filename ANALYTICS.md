# Analytics & Attribution — how it's set up

Everything is pre-wired. **To turn on Google Analytics, you only do ONE thing:**
add your GA4 Measurement ID to the environment.

```
NEXT_PUBLIC_GA_ID="G-XXXXXXXX"
```

(locally in `.env`, and in Vercel → Project → Settings → Environment Variables for production)

That's it. Once the ID is present:
- the cookie-consent banner appears,
- GA loads **only after the visitor clicks Accept** (Google Consent Mode),
- page views + the `waitlist_signup` conversion event start flowing,
- with no GA ID, **no banner and no cookies** are shown at all.

---

## What works WITHOUT Google Analytics (already live)

Per-signup **traffic-source attribution** is independent of GA and already saving to
Firestore on every waitlist entry. Each document includes:

| field          | meaning                                                            |
|----------------|--------------------------------------------------------------------|
| `source`       | platform: instagram / tiktok / youtube / twitter / reddit / etc., or `direct` |
| `medium`       | `campaign` (from UTM), `referral`, or `none`                       |
| `campaign`     | `utm_campaign` value, if any                                       |
| `referrer`     | raw referring URL                                                  |
| `landingPath`  | first page the visitor hit                                         |
| `formLocation` | which form on the page (hero / bottom)                             |

**Source logic:** UTM tag wins (`?utm_source=instagram`), else auto-detected from the
browser referrer, else `direct`.

### Tag your shared links for clean data
- Instagram bio: `https://yourdomain.com/?utm_source=instagram`
- TikTok:        `https://yourdomain.com/?utm_source=tiktok&utm_campaign=launch`
- YouTube:       `https://yourdomain.com/?utm_source=youtube`

View results in Firebase Console → Firestore → `waitlist` collection, and (once GA is on)
in GA4 → Reports → Acquisition.
