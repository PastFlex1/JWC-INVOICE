import { db } from './src/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

async function run() {
  const emailsCollection = collection(db, 'emails');
  const q = query(emailsCollection, orderBy('date', 'desc'), limit(10));
  
  const snapshot = await getDocs(q);
  console.log(`Found ${snapshot.docs.length} emails in Firestore:`);
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- [${data.type}] UID: ${data.uid}, Subject: ${data.subject}, MessageID: ${data.messageId}`);
  });
}

run().catch(console.error);
