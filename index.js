const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config();
const app = express()

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
    console.log(user);
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
console.log(token)
    res.send({ token })
  })

  app.get('/classes', async (req, res) => {
    const result = await classesCollection.find().toArray();
    res.send(result);
  });
  app.post('/classes', async (req, res) => {
    const user = req.body;
    const result = await classesCollection.insertOne(user);
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
  console.error(error);
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
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
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

