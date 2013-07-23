"use strict";

var tests
  , splitOnWordBoundary = require('./utils').splitOnWordBoundary
  ;

tests = [
  // 0
  // doesn't break when the message length is exact on a word boundary
  { msg: "Just need a message that's a good 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates"
  , result: ["Just need a message that's a good 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates"]
  }

  // 1
  // doesn't break when the message length is exact, even with non-word boundaries
, { msg: "Just need a message that's a bad 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates."
  , result: ["Just need a message that's a bad 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates."]
  }


  // 2
  // breaks on a word boundary
, { msg: "Just need a message that's a good 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates and then some stuff"
  , result: [
      "Just need a message that's a good 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates"
    , "and then some stuff"
    ]
  }


  // 3
  // breaks after a word boundary
, { msg: "Just need a message that's a bad 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates and then some stuff"
  , result: [
      "Just need a message that's a bad 154 characters long and it's okay if it doesn't make sense as long as it ends with the word ethylenediaminetetraacetates"
    , "and then some stuff"
    ]
  }


  // 4
  // breaks before a word boundary
, { msg: "Just need a message that's a good 154 characters long and it's okay if it does not make sense as long as it ends with the word ethylenediaminetetraacetates and then some stuff"
  , result: [
      "Just need a message that's a good 154 characters long and it's okay if it does not make sense as long as it ends with the word"
    , "ethylenediaminetetraacetates and then some stuff"
    ]
  }


  // 5
  // this tests a long message that breaks on a non-word character and removes the extra space
, { msg: "This is a really long message and that's okay, I'd prefer it long any ol' way. Lalalala Ahuramazda! And something else in turkish murkish lurkish durkish. Hey mimi. You can't read this because you're over there. It's a long message."
  , result: [
      "This is a really long message and that's okay, I'd prefer it long any ol' way. Lalalala Ahuramazda! And something else in turkish murkish lurkish durkish."
    , "Hey mimi. You can't read this because you're over there. It's a long message."
    ]
  }


  // 6
  // This tests hyphenation
, { msg: "Just need a message that's a good 154 characters long and it's okay if it doesn't make sense as long as it ends with the word omylolzethylenediaminetetraacetates and then some stuff"
  , result: [
      "Just need a message that's a good 154 characters long and it's okay if it doesn't make sense as long as it ends with the word omylolzethylenediaminetetra-"
    , "acetates and then some stuff"
    ]
  }

  // needs test for removing excess newlines and spaces
];

tests.forEach(function (test, t) {
  var result
    ;

  result = splitOnWordBoundary(test.msg, 154);
  result.forEach(function (res, i) {
    if (res !== test.result[i]) {
      console.log('Test', t, i);
      console.error('Got: \n', JSON.stringify(result[0]));
      console.error('Expected: \n', JSON.stringify(test.result[0]));
      throw new Error('stop');
    }
  });
});
