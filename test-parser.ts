import { simpleParser } from 'mailparser';

async function test() {
  const emailSource = `From: "Past Flex" <past6867@gmail.com>
To: sales@jcwflowers.com
Subject: Re: Factura 6867 de JCW Flowers
Message-ID: <CAO3HkSJ2cc9RfkfVLSyXnDg7xbJD6zRXgLTSHKf-O0qSMQFgBQ@mail.gmail.com>

This is a test`;

  const parsed = await simpleParser(emailSource);
  console.log('parsed.to:', JSON.stringify(parsed.to));
  
  const to = parsed.to ? (Array.isArray(parsed.to) ? parsed.to.flatMap((t: any) => t.value.map((v: any) => v.address!)) : parsed.to.value.map((v: any) => v.address!)) : [];
  console.log('Processed to:', to);
}

test();
