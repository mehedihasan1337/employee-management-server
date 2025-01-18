const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000

//  middleware
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2ucux.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const userCollection = client.db("employeeDB").collection("users");
    const sheetCollection = client.db("employeeDB").collection(" sheets");


    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token })
    })
    // middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
      })
    }

    // user
    app.post('/users', async (req, res) => {
      const user = req.body

      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })
    app.get('/users', verifyToken, async (req, res) => {
      console.log(req.headers)
      const result = await userCollection.find().toArray()
      res.send(result)
    })
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })
    app.get('/users/hr/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let hr = false
      if (user) {
        hr = user?.role === 'hr'
      }
      res.send({ hr })
    })
    //  Sheet
    app.post('/sheets', async (req, res) => {
      const item = req.body
      const result = await sheetCollection.insertOne(item)
      res.send(result)
    })
    app.get('/sheets', async (req, res) => {
      const result = await sheetCollection.find().toArray()
      res.send(result)
    })
    app.get('/sheets/single/:id', async (req, res) => {
      const id = req.params.id
      console.log(id)
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return res.status(400).json({ error: "Invalid ObjectId format" });
    }
      const query = { _id: new ObjectId(id) }
      const result = await sheetCollection.findOne(query)
      res.send(result)

    })
    app.patch('/sheets/update/:id', async (req, res) => {
      const sheet = req.body
      const id = req.params.id
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return res.status(400).json({ error: "Invalid ObjectId format" });
    }
      const filter = { _id: new ObjectId(id)  }
      const updateDoc = {
        $set: {
            tasks: sheet.tasks,
            hours: sheet.hours,
            date: sheet.date,
            // email: sheet.user.email

        }
      }
      const result = await sheetCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.get('/sheets/:email', async (req, res) => {
      const email = req.params.email;
      // const decodedEmail=req.user?.email

      // if (decodedEmail !== email)
      //   return res.status(401).send({ message: 'unauthorized access' })
      const query = { email }
      const result = await sheetCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/sheets/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await sheetCollection.deleteOne(query)
      res.send(result)

    })
    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Employee Management server is running')
})

app.listen(port, () => {
  console.log(`Employee Management server is running on port:${port}`)
})