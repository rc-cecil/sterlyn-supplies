# The simpler Sterlyn workflow

Staff are people working for the business. The owner manages access and assignments; the website records actions and keeps tracking current.

## Customers who contact you directly on WhatsApp

Open **Enquiries → Add WhatsApp enquiry**. Enter the customer's name, WhatsApp number with country code, what they need and quantity. Email and extra requirements are optional. Choose **Direct WhatsApp**, **Website WhatsApp**, **Phone** or **Other**, then save. The form closes, an SQ reference appears, and the enquiry opens with its source in Recent activity. It is assigned to the staff member recording it; owner/admin can reassign it.

Confirm the agreement using the same action below. Phone-only requests still get a private tracking link; no email is invented or queued. Use **Share tracking in WhatsApp** to open a draft for that customer, then review and send it yourself. On an existing order, **Copy tracking link** also reveals the WhatsApp sharing action. If the customer provides an email later, you can add it while confirming the order.

General website WhatsApp buttons draft “Hi Sterlyn, I’m enquiring from your website.” The business number is not printed on the public page, though WhatsApp links necessarily contain the destination number. Clicking a link does not prove a message was sent and does not create a named enquiry. Staff record those conversations with the action above. The site cannot automatically read private WhatsApp chats; future official webhook integration is a separate configuration project.

## Owner: confirm the agreement once

1. Open **Enquiries** and choose the customer's request.
2. Choose **Confirm order & tracking**. Enter the agreed amount and delivery address, check the agreement confirmation, then confirm. You can optionally choose a colleague to handle the order.
3. The edit form closes. A saved confirmation shows the order reference and **Copy customer tracking link**. One confirmation email is queued automatically when an email address is recorded. You do not need a separate Agreed save or an internal note.

The private tracking link works immediately. **Email delivery is on hold**, so queued email is not sent. The personal sender configuration has been removed. No company mailbox or external email service is connected by this change.

You can copy the same active tracking link later from the order, without regenerating it or queueing another email. Share it only with the relevant customer.

## Staff: open My work and do the next action

The staff portal is **http://127.0.0.1:3000/staff**. Staff use the work email and password supplied by the owner; no Google sign-in or emailed invitation is required.

Assigned enquiries and orders appear in **My work**. Open a record and use its next-action button, such as **Start processing** or **Mark dispatched**. The form is not left open after saving. Current status and recent activity show what was completed, by whom and when. The owner's workspace reflects the same saved updates.

Routine notes are optional. A short explanation is still needed when reversing a financial receipt. Normal status updates are logged automatically. Regular sales, support and delivery colleagues cannot edit another colleague's records or reassign work to themselves; owner/admin manage the whole team.

Order stages remain Confirmed → Processing → Ready for Delivery → Dispatched → Delivered → Completed. Delivery exceptions live under **Edit details / other status**. Nothing in a WhatsApp conversation automatically confirms a payment.

## Owner: create a colleague's login once

Open **Manage team** → **Add staff member**. Provide their name, work email/login, job and password (at least 12 characters). Give those credentials to the colleague privately. Account creation does not create an email mailbox. The owner chooses the work email; staff do not have to register using their personal Gmail.

The owner can change staff jobs and passwords, suspend access or restore access. Password changes and suspension sign out existing sessions. Owner access cannot be overwritten through these controls. Existing customer accounts and historical staff records are preserved.

To assign existing work, open the enquiry's **Update enquiry** or the order's **Edit details / other status**, choose the colleague and save. The colleague sees it on their next visit or refresh. The workspace also refreshes each minute while visible.

## Payments and reports are separate from creating tracking

The owner/admin records a verified deposit or balance using **Record a payment received**. This is not required to generate a tracking link. No online checkout or automatic payment confirmation is introduced. Fulfilment may proceed under the business's agreed payment arrangement.

The Efferd Dashboard 1 composition is adapted to Sterlyn's real work. **Needs attention / My work** comes first; **Activity & reports** is optional. No demo revenue or fabricated activity is included. The public showroom, catalogue imagery and Design Studio retain their existing design.

## Local verification

The previous local screenshot walkthrough was removed during deployment cleanup. Follow the workflow in this guide. Automated acceptance journeys remain in GitHub and use only synthetic records in `sterlyn_test`; they do not send WhatsApp messages or external email.

All changes are local on `main`, without a new branch, push or production deployment.

### Updated workspace chart

Owners can inspect daily enquiry and order activity using the 7/30/90-day controls. Hover or tap a point, or focus the chart and use the arrow keys. The enquiry/order chips show or hide each series; one always remains visible. For exact figures, open **Activity & reports → View exact daily counts**.

Use the search box inside the work queue to find a customer or reference among the displayed recent/assigned records. **View all** opens the complete enquiry or order list. Staff still land on their assignments. Reports do not add steps to confirming an agreement or updating delivery.
