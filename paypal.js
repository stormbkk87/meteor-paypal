
Meteor.Paypal = {

  account_options: {},
  //authorize submits a payment authorization to Paypal
  authorize: function(card_info, payment_info, callback){
    Meteor.call('paypal_submit', 'authorize', card_info, payment_info, callback);
  },
  purchase: function(card_info, payment_info, callback){
    Meteor.call('paypal_submit', 'sale', card_info, payment_info, callback);
  },
  //config is for the paypal configuration settings.
  config: function(options){
    this.account_options = options;
  },
  payment_json: function(){
    return {
      "intent": "sale",
      "payer": {"payment_method": "credit_card","funding_instruments": []},
      "transactions": []
    };
  },
  //parseCardData splits up the card data and puts it into a paypal friendly format.
  parseCardData: function(data){
    return {
      credit_card: {
        'type': data.type,
        'number': data.number,
        'first_name': data.first_name,
        'last_name': data.last_name,
        'cvv2': data.cvv2,
        'expire_month': data.expire_month,
        'expire_year': data.expire_year
      }};
  },
  //parsePaymentData splits up the card data and gets it into a paypal friendly format.
  parsePaymentData: function(data){
    return {
      item_list: {
        items: data.products,   // [{name, price, currency: 'USD', quantity}]
        shipping_address: data.shipping 
        /*
        {
          'recipient_name': data.shipping.recipient_name,
          'type': data.shipping.type,
          'line1': data.shipping.line1,
          'line2': data.shipping.line2,
          'city': data.shipping.city,
          'country_code': data.shipping.country_code,
          'postal_code': data.shipping.postal_code,
          'state': data.shipping.state,
          'phone': data.shipping.phone
        }*/
      },
      amount: {
        total: data.total, 
        currency: data.currency
      },
      description: data.description
    };
  }
};

if (Meteor.isServer){
  Meteor.startup(function(){
    var paypal_sdk = Npm.require('paypal-rest-sdk');
    var Fiber = Npm.require('fibers');
    var Future = Npm.require('fibers/future');
    Meteor.methods({
      paypal_submit: function(transaction_type, cardData, paymentData){
        paypal_sdk.configure(Meteor.Paypal.account_options);
        var payment_json = Meteor.Paypal.payment_json();
        payment_json.intent = transaction_type;
        payment_json.payer.funding_instruments.push(Meteor.Paypal.parseCardData(cardData));
        payment_json.transactions.push(Meteor.Paypal.parsePaymentData(paymentData));
        var fut = new Future();
        this.unblock();
        paypal_sdk.payment.create(payment_json, Meteor.bindEnvironment(function(err, payment){
          if (err){
            fut.return({saved: false, error: err});
          } else {
            fut.return({saved: true, payment: payment});
          }
        },
        function(e){
          console.error(e);
        }));
        return fut.wait();
    }});
  });
}

