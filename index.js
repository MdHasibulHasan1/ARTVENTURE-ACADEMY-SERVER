const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config();
const app = express()

const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.itpj9d6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    const usersCollection = client.db('summer-camp').collection('users')
    const classesCollection = client.db('summer-camp').collection('classes')
    const selectedClassesCollection = client.db('summer-camp').collection('SelectedClasses')
const paymentCollection=client.db('summer-camp').collection('payments')
    app.get('/instructors',async (req, res) => {
      const result = await usersCollection.find({ role: "instructor" }).toArray();
      res.send(result);
    });

    // users apis
    
    app.get('/users',async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // ----------verify admin, instructor------------------------
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
  // console.log("email",email, req.decoded.email)
     if (req.decoded.email !== email) {
        res.send({ role: false })
      } 

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      // console.log("/a//",user);
      const result = { role: user?.role ==="admin" }
      // console.log(result)
      res.send(result);
    })
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
// console.log("remail",email, req.decoded.email)
      if (req.decoded.email !== email) {
        res.send({ role: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      // console.log("check instructor",user)
      const result = { role: user?.role === "instructor" }
      res.send(result);
    })

    // -------------------
   // Update a user's role as an instructor
   app.patch('/users/instructor/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: 'instructor' } }
      );

      if (result.modifiedCount === 1) {
        res.json({ success: true, message: 'User role updated to instructor' });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Update a user's role as an admin
  app.patch('/users/admin/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: 'admin' } }
      );

      if (result.modifiedCount === 1) {
        res.json({ success: true, message: 'User role updated to admin' });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });



   // jwt
   app.post('/jwt', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" })
// console.log(token)
    res.send({ token })
  })



  app.get('/mySelectedClasses/:email', verifyJWT,async (req,res) => {
    const { email } = req.params;
    if (req.decoded.email !== email) {
      res.send({ role: false })
    }
    const result = await selectedClassesCollection.find({ email: email }).toArray();
    res.send(result);
  });
  
  app.delete('/mySelectedClasses/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await selectedClassesCollection.deleteOne(query);
    res.send(result);
  })
  app.post('/selectedClasses', async (req, res) => {
    const selectedClass = req.body;
    const result = await selectedClassesCollection.insertOne(selectedClass);
    res.send(result);
  });
  app.get('/selectedClasses', async (req, res) => {
    
    const result = await selectedClassesCollection.find({ }).toArray();
    res.send(result);
  });
  
  
  
  app.get("/popularClasses", async (req, res) => {
      try {
        const popularClasses = await classesCollection.find().sort({ totalEnrolled: -1 }).limit(6).toArray();
        res.json(popularClasses);
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
  })


  
// GET top 6 instructors based on number of students
app.get('/topInstructors', async (req, res) => {
  
});
// ----------
  // Update classes total enrolled
  app.patch('/popularClasses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await classesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { totalEnrolled: parseFloat(req.body.totalEnrolled)+1 } }
      );
      if (result.modifiedCount === 1) {
        res.json({ success: true, message: 'updated successfully' });
      } else {
        res.status(404).json({ success: false, message: 'not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });  
 



// Update a class by ID

app.put("/myClasses/update/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  // console.log(body);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      price: body.price,
      imgURL: body.imgURL,
      className: body.className
    },
  };
  const result = await classesCollection.updateOne(filter, updateDoc);
  res.send(result);
}); 

  app.get('/myClasses/:email',  verifyJWT, async (req,  res) => {
    const { email } = req.params;
// console.log("fff",req.decoded)
   const decodedEmail = req.decoded?.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      } 
    const result = await classesCollection.find({ instructorEmail: email }).toArray();
    res.send(result);
  });
  app.get('/classes', async (req, res) => {
    const result = await classesCollection.find().toArray();
    res.send(result);
  });
  app.post('/classes', async (req, res) => {
    const user = req.body;
    const result = await classesCollection.insertOne(user);
    res.send(result);
  });


  app.get('/approvedClasses',async (req, res) => {
    const result = await classesCollection.find({ status: "approved" }).toArray();
    res.send(result);
  });
app.patch("/classes/:id", async (req, res) => {
 
    const id = req.params.id;
    const feedback = req.body.feedback;

const filter = { _id: new ObjectId(id) };
const updateDoc = {
  $set: {
    feedback
  },
};

const result = await classesCollection.updateOne(filter, updateDoc);
res.send(result);
 
});


  // Route to update class status to "approved"
app.put('/classes/approve/:id', async(req, res) => {
  try {
  const id = req.params.id;
  const result = await classesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'approved' } }
  );
  if (result.modifiedCount === 1) {
    res.json({ success: true, message: 'Class status updated to approve' });
  } else {
    res.status(404).json({ success: false, message: 'class not found' });
  }
} catch (error) {

  res.status(500).json({ success: false, message: 'Internal server error' });
}
});

// Route to update class status to "denied"
app.put('/classes/deny/:id', async(req, res) => {
  try {
    const id = req.params.id;
    const result = await classesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'denied' } }
    );
    if (result.modifiedCount === 1) {
      res.json({ success: true, message: 'Class status updated to pending' });
    } else {
      res.status(404).json({ success: false, message: 'class not found' });
    }
  } catch (error) {

    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// payment related api
 // create payment intent
 app.post('/create-payment-intent', verifyJWT, async (req, res) => {
  const { price, } = req.body
  const amount = parseFloat(price) * 100
//  console.log(price, amount)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card'],
  })

  res.send({
    clientSecret: paymentIntent.client_secret,
  })
})


app.post('/payments', verifyJWT, async (req, res) => {
  const { paymentInfo,selectedId } = req.body;
  const insertResult = await paymentCollection.insertOne(paymentInfo);
console.log(paymentInfo)
  const query = { _id:   new ObjectId(selectedId) } 
      const deleteResult = await selectedClassesCollection.deleteOne(query)
    console.log(query);
      
      res.send({ insertResult, deleteResult });

 
})

   


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Your server is running')
})

app.listen(port, () => {
  console.log(`server is running on port ${port}`)
})

