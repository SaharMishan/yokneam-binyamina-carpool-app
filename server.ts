
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
let db: any = null;
let fcm: any = null;

async function initAdmin() {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || 
                              process.env.VITE_FIREBASE_SERVICE_ACCOUNT ||
                              process.env.service_account;
    
    if (serviceAccountJson) {
      console.log("🛠️ FIREBASE_SERVICE_ACCOUNT found. Length:", serviceAccountJson.length);
      try {
        const sanitizedJson = serviceAccountJson.trim();
        const serviceAccount = JSON.parse(sanitizedJson);
        
        if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        console.log("📄 Service Account JSON parsed. Project:", serviceAccount.project_id);
        
        initializeApp({
          credential: cert(serviceAccount),
          databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });
        console.log("🚀 Firebase Admin initialized with Service Account.");
        
        db = getFirestore();
        fcm = getMessaging();

        // QUICK TEST: Try to read one document to verify permissions
        try {
          console.log("🧪 Testing Firestore permissions...");
          await db.collection('notifications').limit(1).get();
          console.log("✅ Firestore read test successful!");
        } catch (testErr: any) {
          if (testErr.code === 7 || testErr.message?.includes('permissions')) {
            console.error("⛔ PERMISSION ERROR: The Service Account is connected but lacks IAM permissions.");
            console.error("👉 ACTION REQUIRED: Add 'Firebase Admin' or 'Cloud Datastore User' role to " + serviceAccount.client_email + " in Google Cloud Console.");
          } else {
            console.error("❌ Firestore test failed:", testErr.message);
          }
        }
      } catch (parseError) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", parseError);
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "carpool-yokneam";
        initializeApp({ projectId });
      }
    } else {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT missing. Using default project settings.");
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "carpool-yokneam";
      initializeApp({ projectId });
      db = getFirestore();
      fcm = getMessaging();
    }
  } catch (error) {
    console.error("❌ Firebase Admin critical initialization failed:", error);
  }
}

// Translation mapping for notifications that might be sent with keys
const TRANSLATIONS: Record<string, string> = {
  'error_self_no_phone': 'חסר מספר טלפון בפרופיל שלך!',
  'profile_incomplete_warning': 'הוסף מספר טלפון עכשיו כדי שיוכלו ליצור איתך קשר ולתאם את הנסיעה.',
  'notif_request_title': 'הצטרפות לנסיעה',
  'notif_join_msg': 'מישהו הצטרף לנסיעה שלך',
  'notif_approved_title': 'בקשתך אושרה!',
  'notif_approved_msg': 'הנהג אישר את הצטרפותך לנסיעה. פרטי הקשר זמינים כעת.',
  'notif_invite_title': 'קיבלת הצעה לנסיעה!',
  'notif_invite_msg': 'נהג הזמין אותך לנסיעה חדשה',
  'notif_invite_accepted_title': 'הזמנה התקבלה!',
  'notif_invite_accepted_msg': 'הנוסע אישר את ההזמנה לנסיעה שלך',
  'notif_rejected_title': 'בקשת ההצטרפות נדחתה',
  'notif_rejected_msg': 'מצטערים, אך לא ניתן לצרף אותך לנסיעה זו כרגע.',
  'notif_trip_cancelled_title': 'נסיעה בוטלה',
  'notif_trip_cancelled_msg': 'נסיעה שהיית רשום/ה אליה בוטלה על ידי הנהג.',
  'notif_passenger_left_title': 'נוסע עזב את הנסיעה',
  'notif_passenger_left_msg': 'אחד הנוסעים עזב את הנסיעה שלך',
  'notif_removed_title': 'הוסרת מהנסיעה',
  'notif_removed_msg': 'הנהג הסיר אותך מהנסיעה המתוכננת.',
  'notif_new_report_title': 'דיווח חדש התקבל',
  'notif_new_report_msg': 'התקבל דיווח חדש במערכת',
};

function translate(text: string): string {
  if (!text) return text;
  return TRANSLATIONS[text] || text;
}

/**
 * Listener for new notifications in Firestore.
 */
function setupNotificationListener() {
  if (!db || !fcm) {
    console.warn("⚠️ Notification listener skipped: Firebase Admin not fully initialized.");
    return;
  }
  
  console.log("📡 Starting Firestore Notification Listener...");
  
  db.collection('notifications')
    .where('createdAt', '>', Timestamp.now())
    .onSnapshot((snapshot: any) => {
      snapshot.docChanges().forEach(async (change: any) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const userId = data.userId;
          if (!userId) return;

          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) return;
            const userData = userDoc.data();
            const tokens = userData?.fcmTokens || [];
            if (tokens.length === 0) return;

            const translatedTitle = translate(data.title || "קארפול יקנעם-בנימינה");
            const translatedBody = translate(data.message || "התראה חדשה");

            const message = {
              notification: { 
                title: translatedTitle, 
                body: translatedBody 
              },
              data: { 
                url: data.relatedTripId ? `/?tripId=${data.relatedTripId}` : (data.url || '/'), 
                type: data.type || 'general',
                notifId: change.doc.id
              },
              tokens: tokens,
              apns: { 
                payload: { 
                  aps: { 
                    sound: 'default', 
                    badge: 1, 
                    'content-available': 1,
                    category: 'GENERAL'
                  } 
                } 
              },
              webpush: {
                headers: { Urgency: 'high' },
                notification: {
                  title: translatedTitle,
                  body: translatedBody,
                  icon: '/logo.svg?v=5',
                  badge: '/logo.svg?v=5',
                  tag: data.type || 'general',
                  renotify: true,
                  data: { url: data.relatedTripId ? `/?tripId=${data.relatedTripId}` : (data.url || '/') }
                }
              }
            };

            const response = await fcm.sendEachForMulticast(message);
            if (response.failureCount > 0) {
              const failedTokens: string[] = [];
              response.responses.forEach((resp: any, idx: number) => { if (!resp.success) failedTokens.push(tokens[idx]); });
              if (failedTokens.length > 0) {
                await db.collection('users').doc(userId).update({ fcmTokens: FieldValue.arrayRemove(...failedTokens) });
              }
            }
          } catch (err) {
            console.error(`❌ Push error for ${userId}:`, err);
          }
        }
      });
    }, (error: any) => {
      console.error("❌ Firestore Listener Error:", error);
      setTimeout(setupNotificationListener, 10000);
    });
}


// Global typing status cleanup (Bonus: keeps it clean if clients crash)
// Every 10 mins clean older than 1 min
setInterval(async () => {
  try {
    const typingSnap = await db.collection('typing_status').get();
    const now = Date.now();
    for (const doc of typingSnap.docs) {
      const data = doc.data();
      let hasUpdate = false;
      const newData = { ...data };
      for (const uid in data) {
        const ts = data[uid];
        if (ts && ts.toMillis() < now - 60000) {
          delete newData[uid];
          hasUpdate = true;
        }
      }
      if (hasUpdate) {
        if (Object.keys(newData).length === 0) {
          await doc.ref.delete();
        } else {
          await doc.ref.set(newData);
        }
      }
    }
  } catch (e) {}
}, 600000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Admin FIRST
  await initAdmin();

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", fcmListener: "active", adminInitialized: !!db });
  });

  // Start the listener if admin is ready
  setupNotificationListener();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa", // Use SPA for easier asset handling
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}


startServer();
