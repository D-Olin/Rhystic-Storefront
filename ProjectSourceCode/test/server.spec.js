// ********************** Initialize server **********************************
const {app, db} = require('../src/index'); // Make sure the path to your index.js is correct

// ********************** Import Libraries ***********************************
const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;
const bcrypt = require('bcrypt');

let agent;

describe('hooks', () => {

  // ********************** SETUP AND TEARDOWN ****************************
  // Define hooks to run before and after the test cases

  // Before running the test cases, we need to insert a test user into the database
  // Runs once before all test cases run
  before(async () => {
    const name = 'test';
    const username = 'testuser';
    const email = 'test@test.com';
    const hashedPassword = await bcrypt.hashSync('testpwd', 10);
    await db.none('INSERT INTO userinfo(name, username, email, password) VALUES($1, $2, $3, $4);', [name, username, email, hashedPassword]);
    console.log('Test User inserted');
  });

  // Intialize the Chai HTTP agent to persist cookies across the test session
  // Runs before each test case
  beforeEach(() => {
    agent = chai.request.agent(app);
  });

  // Close the agent after each test case
  // Runs after each test case
  afterEach(() => {
    agent.close();
  });

  // Delete the test user from the database after all test cases run
  // Runs once after all test cases run
  after(async () => {
    const username = 'testuser'
    await db.none('DELETE FROM userinfo WHERE username = $1', [username]);
  });

  

// ********************** DEFAULT WELCOME TESTCASE ****************************
describe('Server!', () => {
  // Sample test case given to test / endpoint
  it('Returns the default welcome message', done => {

    agent
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      }); 
  });
});


// *********************** UNIT TEST CASES FOR /register ENDPOINT **************************

describe('Testing Register API', async() => {
  // Positive Test Case: Valid user registration
  it('Positive: /signup', done => {
    agent
      .post('/signup')
      .send({ name: 'John Doe', username: 'johndoe', email: 'john@example.com', password: 'password123' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res).to.redirectTo(/\/login$/);
        done();
      });
  });

  //  Invalid user registration (missing password)
  it('Negative: /signup', done => {
    agent
      .post('/signup')
      .send({ username: 'janedoe', email: 'jane@example.com', password: 'password123'})
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.error).to.equals('Error inserting user');
        done();
      });
  });
  
  const username = 'johndoe'
  await db.none('DELETE FROM userinfo WHERE username = $1', [username]);
});

// ********************** UNIT TEST CASES FOR /login ENDPOINT **************************

describe('Testing Login API', () => {
  // Positive Test Case: Valid user login
  it('Positive: /login', done => {
    agent
      .post('/login')
      .send({ username: 'testuser', password: 'testpwd' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res).to.redirectTo(/\/$/);
        done();
      });
  });

  // Negative Test Case: User not in database
  it('Negative, not in database: /login', done => {
    agent
      .post('/login')
      .send({ username: 'wronguser', password: 'testpwd' })
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.body.error).to.equals('Error logging in user');
        done();
      });
  }); 

  // Negative Test Case: Invalid user login (no name)
  it('Negative, invalid input: /login', done => {
    agent
      .post('/login')
      .send({ username: null, password: 'testpwd' })
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.body.error).to.equals('Error logging in user');
        done();
      });
  });
});


});
