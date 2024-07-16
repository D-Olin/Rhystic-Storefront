// ********************** Initialize server **********************************
const server = require('../index'); // Make sure the path to your index.js is correct

// ********************** Import Libraries ***********************************
const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************
describe('Server!', () => {
  // Sample test case given to test / endpoi
  it('Returns the default welcome message', done => {
    chai
      .request(server)
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

describe('Testing Register API', () => {
  // Positive Test Case: Valid user registration
  it('Positive: /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({ name: 'John Doe', username: 'johndoe', email: 'john@example.com', password: 'password123' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equals('User registered successfully');
        done();
      });
  });

  //  Invalid user registration (missing password)
  it('Negative: /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({ name: 'Jane Doe', username: 'janedoe', email: 'jane@example.com' })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.equals('Invalid input');
        done();
      });
  });
});

// ********************** UNIT TEST CASES FOR /login ENDPOINT **************************

describe('Testing Login API', () => {
  // Positive Test Case: Valid user login
  it('Positive: /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({ username: 'johndoe', password: 'password123' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equals('Login successful');
        done();
      });
  });

  // Negative Test Case: Invalid user login (wrong password)
  it('Negative: /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({ username: 'johndoe', password: 'wrongpassword' })
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.body.message).to.equals('Invalid credentials');
        done();
      });
  });
});
