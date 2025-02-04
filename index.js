const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe =require('stripe')(process.env.STRIPE_SECRET_KEY)
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
    // await client.connect();

    const userCollection = client.db("employeeDB").collection("users");
    const sheetCollection = client.db("employeeDB").collection(" sheets");
    const payCollection = client.db("employeeDB").collection(" pay");
    const paymentCollection = client.db("employeeDB").collection(" payments");


    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token })
    })
    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization)
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
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }
    const verifyHr = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isHr = user?.role === 'hr'
      if (!isHr) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
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





    // update salary
    app.get('/users/single/:id',verifyToken, async (req, res) => {
      const id = req.params.id
      // console.log(id)
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return res.status(400).json({ error: "Invalid ObjectId format" });
    }
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.findOne(query)
      res.send(result)

    })
    app.patch('/users/update/:id', async (req, res) => {
      const user = req.body
      const id = req.params.id
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return res.status(400).json({ error: "Invalid ObjectId format" });
    }
      const filter = { _id: new ObjectId(id)  }
      const updateDoc = {
        $set: {
            salary: user.salary,
            

        }
      }
      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    // make hr
    app.patch('/users/makeHr/:id',verifyToken,verifyAdmin, async (req, res) => {
     const id = req.params.id
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return res.status(400).json({ error: "Invalid ObjectId format" });
    }
      const filter = { _id: new ObjectId(id)  }
      const updateDoc = {
        $set: {
           
            role:'hr'

        }
      }
      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // fire
    app.patch('/users/fire/:id',verifyToken, async (req, res) => {
     const id = req.params.id
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid ObjectId format" });
    }
      const filter = { _id: new ObjectId(id)  }
      const updateDoc = {
        $set: { 
           isFired:true
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc)
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

// all sheets


    app.get('/sheets/single/:id',verifyToken, async (req, res) => {
      const id = req.params.id
      console.log(id)
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        return res.status(400).json({ error: "Invalid ObjectId format" });
    }
      const query = { _id: new ObjectId(id) }
      const result = await sheetCollection.findOne(query)
      res.send(result)

    })
    app.patch('/sheets/update/:id',verifyToken, async (req, res) => {
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



    app.get('/sheets/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      // const decodedEmail=req.user?.email

      // if (decodedEmail !== email)
      //   return res.status(401).send({ message: 'unauthorized access' })
      const query = { email }
      const result = await sheetCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/sheets/:id',verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await sheetCollection.deleteOne(query)
      res.send(result)

    })
    // pay
    app.post('/pay', async (req, res) => {
      const pay = req.body
      const result = await payCollection.insertOne(pay)
      res.send(result)
    })
    app.get('/pay',verifyToken,  async (req, res) => {
      console.log(req.headers)
      const result = await payCollection.find().toArray()
      res.send(result)
    })

    // payment 
    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { amount } = req.body;
        console.log("Received amount:", amount);
    
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100,
          currency: 'usd',
        });
    
        res.send({ clientSecret: paymentIntent.client_secret });
      }
       catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(400).send({ error: error.message });
      }
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body
      const paymentResult = await paymentCollection.insertOne(payment)
      console.log('payment info', payment)
    
      res.send({ paymentResult})

    })
    app.get('/payments/:email',verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const result = await paymentCollection.find(query).toArray()
      res.send(result)
    })

    // slug diteles
    app.get('/employees/:slug',verifyToken,verifyHr, async (req, res) => {
      const { slug } = req.params;
      try {
       
        const payments = await paymentCollection.find({ email: slug }).toArray();
    
        if (payments.length >0){
          const allPayments= payments.map((payment)=>({
            name: payment.name,
            email: payment.email,
            designation: payment.designation,
            date: payment.date,
            photoURL: payment.photoURL,
            salary: payment.salary,
            month: payment.month,
            year: payment.year, 
          }))
         
          return res.json(allPayments)
        
        } else {
          return res.status(404).send('Employee not found');
        }
      } catch (err) {
        console.error('Error fetching employee data:', err);
        return res.status(500).send('Internal Server Error');
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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