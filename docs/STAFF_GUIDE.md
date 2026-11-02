# Using the Sterlyn business desk

Staff means a person: the owner, a sales colleague or someone arranging delivery. It is not an AI agent. One person can handle all these jobs. The website saves enquiries, copies agreed details into orders, prepares email updates and keeps tracking current.

Open **http://127.0.0.1:3000/admin** and sign in with your existing staff account. Passwords and role permissions are still required. Authenticator enrollment is not mandatory. Do not use the read-only Netlify preview to test saving real enquiries.

## Your daily work

| Where | What you do |
| --- | --- |
| Home | Check new requests, follow-ups and delivery progress. The charts use saved records in the chosen period. |
| Enquiries | Open a request, read the selected items, contact the customer and update the discussion status. |
| Orders | Record verified payments and update preparation/delivery. |
| Customers | Find a customer and open their related enquiries and orders. |
| Catalogue | Add or edit products, pictures, categories and inspirations, if your role allows it. |

**Other tools** holds occasional tasks such as staff access, email checks, website content and technical configuration. Assignment, extra notes and activity history expand when you need them.

## From a customer request to a completed order

1. The customer selects items and submits the Contact form. A saved enquiry appears in **Enquiries** with its SQ reference. An empty list means there are no saved requests matching your filters; it is not a prompt to create fake customer activity.
2. Choose **Open** beside the enquiry. Check the customer’s items, quantities, finish and project notes.
3. Discuss the price, payment and delivery on WhatsApp. **Contact on WhatsApp** is available when a phone number was provided. Otherwise use the conversation the customer initiated with the business, or the supplied email address. The website cannot read the WhatsApp conversation.
4. Choose **Agreed**, write a brief internal note and **Save enquiry** once both sides agree.
5. Choose **Convert to order**. Check the copied customer/items, enter the agreed amount and delivery address, confirm the review and create the order. No payment is assumed.
6. Open the order. When the owner/admin has actually verified a deposit or payment outside the website, expand **Record a payment received**. Enter the amount, actual receipt time and payment method. A later balance payment is a separate receipt. Sales staff cannot confirm payments.
7. Under **Update delivery progress**, choose the next status, add any customer-safe update and a brief internal reason, then save. Optional delivery details and assignment expand separately.
8. Follow **Confirmed → Processing → Ready for Delivery → Dispatched → Delivered → Completed**. Use On Hold, Delayed or Cancelled when appropriate. The system only offers valid next stages.
9. Each changed status updates the private tracking page and queues an email. The customer uses the secure email link without an account. Customer tracking hides contact details, agreed amounts, receipts and staff notes.

Queued email is not the same as delivered email. A running worker and configured SMTP are required for sending. Development mail belongs in Mailpit; production needs a configured business sender. Opening WhatsApp does not send a message—the customer or staff member must press Send there.

## Screenshot walkthrough and local verification

Open http://127.0.0.1:3005/ while the local gallery server is running, or open [the saved screenshot walkthrough](../out/staff-walkthrough/index.html). The numbered screenshots come from the actual browser workflow against `sterlyn_test`, using synthetic customer details and a synthetic agreement. They cover selection, saved enquiry, staff review, agreement, conversion, deposit/balance, every delivery stage, guest tracking, generated email and phone layout. No WhatsApp message or external email is sent.

The repeatable browser check is `tests/e2e/showroom-operations.spec.ts`. It requires the isolated test database and test server described in the operations guide. It writes the gallery to ignored `out/staff-walkthrough/` and removes only its own synthetic fixture. Never point acceptance tests at the business database.

The November 2026 simplification is local work on `main`. The completed feature branch was fast-forwarded locally and its local branch deleted at the owner's request. These changes have not been pushed, merged on GitHub, or deployed.
