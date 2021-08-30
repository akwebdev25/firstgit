var express = require('express');
var router = express.Router();
var dbConn  = require('../lib/db');
/* GET users listing. */
router.get('/', function(req, res, next) {
    dbConn.query('SELECT * FROM users ORDER BY id desc',function(err,rows)     {
        if(err) {
            req.flash('error', err);
            // render to views/books/index.ejs
            res.render('users',{data:''});   
        } else {
            // render to views/books/index.ejs
            res.render('users/userList',{data:rows});
        }
    });
});

// display add book page
router.get('/addUser', function(req, res, next) {  
    // render to add.ejs
    res.render('users/addUser', {
        fname: '',
        lname: '',      
        pnumber: '',      
        email: ''    
    })
})

// add a new user
router.post('/add', function(req, res, next) {
    let fname = req.body.fname;
    let lname = req.body.lname;
    let pnumber = req.body.pnumber;
    let email = req.body.email;
    let errors = false;
    if(fname.length === 0 || lname.length === 0 || pnumber.length === 0 || email.length === 0) {
        errors = true;
        // set flash message
        req.flash('error', "Please enter all fields");
        res.redirect('/users/addUser');
        // render to add.ejs with flash message
        res.render('users/addUser', {
            fname: '',
	        lname: '',      
	        pnumber: '',      
	        email: ''
        })
    }
    // if no error
    if(!errors) {
        var form_data = {
            fname: fname,
	        lname: lname,      
	        pnumber: pnumber,      
	        email: email
        }
        // insert query
        dbConn.query('INSERT INTO users SET ?', form_data, function(err, result) {
            //if(err) throw err
            if (err) {
                req.flash('error', err)
                // render to add.ejs
                res.render('users/addUser', {
                    fname: form_data.fname,
                    lname: form_data.lname,
                    pnumber: form_data.pnumber,      
                    email: form_data.email   
                })
            } else {                
                req.flash('success', 'Users successfully added');
                res.redirect('/users');
            }
        })
    }
})

// display edit user page
router.get('/editUser/(:id)', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('SELECT * FROM users WHERE id = ' + id, function(err, rows, fields) {
        if(err) throw err
        // if user not found
        if (rows.length <= 0) {
            req.flash('error', 'User not found with id = ' + id)
            res.redirect('/users')
        }
        // if book found
        else {
            // render to editUser.ejs
            res.render('users/editUser', {
                title: 'Edit User', 
                id: rows[0].id,
                fname: rows[0].fname,
                lname: rows[0].lname,
                pnumber: rows[0].pnumber,
                email: rows[0].email,
            })
        }
    })
})

// update user data
router.post('/update/:id', function(req, res, next) {
    let id = req.params.id;
    let fname = req.body.fname;
    let lname = req.body.lname;
    let pnumber = req.body.pnumber;
    let email = req.body.email;
    let errors = false;
    if(fname.length === 0 || lname.length === 0 || pnumber.length === 0 || email.length === 0) {
        errors = true;
        // set flash message
        req.flash('error', "Please enter all fields");
        // render to add.ejs with flash message
        res.render('users/addUser', {
            fname: '',
	        lname: '',      
	        pnumber: '',      
	        email: ''
        })
    }
    // if no error
    if( !errors ) {   
        var form_data = {
            fname: fname,
	        lname: lname,      
	        pnumber: pnumber,      
	        email: email
        }
        // update query
        dbConn.query('UPDATE users SET ? WHERE id = ' + id, form_data, function(err, result) {
            //if(err) throw err
            if (err) {
                // set flash message
                req.flash('error', err)
                // render to editUser.ejs
                res.render('users/editUsers', {
                    id: req.params.id,
                    fname: form_data.fname,
                    lname: form_data.lname,
                    pnumber: form_data.pnumber,
                    email: form_data.email
                })
            } else {
                req.flash('success', 'User successfully updated');
                res.redirect('/users');
            }
        })
    }
})

// delete user
router.get('/delete/(:id)', function(req, res, next) {
    let id = req.params.id;
    dbConn.query('DELETE FROM users WHERE id = ' + id, function(err, result) {
        //if(err) throw err
        if (err) {
            // set flash message
            req.flash('error', err)
            // redirect to books page
            res.redirect('/users')
        } else {
            // set flash message
            req.flash('success', 'User successfully deleted! ID = ' + id)
            // redirect to books page
            res.redirect('/users')
        }
    })
})

module.exports = router;