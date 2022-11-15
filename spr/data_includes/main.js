PennController.ResetPrefix(null); // Shorten command names (keep this line here))
DebugOff()   // Uncomment this line only when you are 100% done designing your experiment



// (Optionally) Inject a question into a trial
const askQuestion = (successCallback, failureCallback, waitTime) => (row) => (row.QUESTION_PRESENTATION=="1" ? [
  newText( "answer_correct" , row.CORRECT ),
  newText( "answer_wrong" , row.WRONG ),  
  newText( "question" , row.QUESTION )
    .center()
    .print()
  ,
  
  newCanvas("Canvas")
    .center()
    .add( -150 , 60 , newText("1:yes") )
    .add( +110 , 60 , newText("0:no") )
    .print()
  ,
    
  newKey("answer", "Digit1Digit0") //https://keycode.info/
    ,
    
  getKey("answer")
    .log()
    .wait()
    .test.pressed( row.CORRECT )
    .success.apply(null, successCallback().concat(
        [getText("answer_correct").css("border-bottom", "5px solid lightCoral")]
    )) 
    .failure.apply(null, failureCallback().concat(
        [getText("answer_wrong").css("border-bottom", "5px solid lightCoral")]
    )),

  // Wait for feedback and to display which option was selected
  newTimer("wait", waitTime)
    .start()
    .wait()

] : []);



const askPracticeQuestion = askQuestion(
  () => [newText("<b>Correct!</b>").color("Green").center().print(), getVar("correct").set(1)],
  () => [newText("<b>Incorrect!</b>").color("Orange").center().print(), getVar("correct").set(0)],
  300
);



const askTrialQuestion = askQuestion(
  () => [getVar("ACCURACY").set(v=>[...v,true]), newText("<b>Correct!</b>").color("Green").center().print(), getVar("correct").set(1)],
  () => [
    getVar("ACCURACY").set(v=>[...v,false]),
    newText("<b>Incorrect!</b>")
      .color("Orange")
      .center()
      .print(),
    // need to repeat the css code, unfortunately, because of the time that follows
    getText("answer_wrong").css("border-bottom", "5px solid lightCoral"),
    // Penalty for the wrong answer is waiting 1000 ms before continuing
    newTimer("wait", 1000)
      .start()
      .wait(),
    getVar("correct").set(0)
  ],
  300
);



// display a primer that can be clicked away by pressing space bar
const newPrimer = () => [
  newText('primer','*')
    .css("font-size", "30pt")
    .css("margin-top", "8px")
    .center()
    .print(),
  newKey(" ").wait(),
  getText('primer').remove(),
];



Header(
    // Declare global variables to store the participant's ID and information
    newVar("ID").global(),
    newVar("CONSENT").global(),
    newVar("ACCURACY", []).global(),
    newVar("correct").global()
)



 // Add the particimant info to all trials' results lines
.log( "participantID"     , getVar("participantID") )


// Sequence of events
//Sequence("setcounter", "questionnaire", "practice", SendResults(), "end")

Sequence("setcounter", "questionnaire", "instructions", "practice", "start_experiment", rshuffle("experiment-filler", "experiment-critical"), SendResults(), "end")



// Start the next list as soon as the participant agrees to the ethics statement
// This is different from PCIbex's normal behavior, which is to move to the next list once 
// the experiment is completed. In my experiment, multiple participants are likely to start 
// the experiment at the same time, leading to a disproportionate assignment of participants to lists.
SetCounter("setcounter");



// Participant information: questions appear as soon as information is input
newTrial("questionnaire",
    defaultText
        .center()
        .cssContainer({"margin-top":"0.2em", "margin-bottom":"1em", "text-align": "center"})
        .print()
    ,
    newText("participant_header", "<h2>Welcome to my experiment!</h2><p>Before beginning the task, please answer the following questions.</p>")
        .center()
    ,
    // Participant ID 
    newText("participantID", "<b>What is your participant code?</b><br>")
        .center()
    ,
    newTextInput("participantID")
        .center()
        .length(6)
        .log()
        .print()
        .settings.css("font-size", "inherit")
    ,

    // Blank
    newText("")
    ,

    // Consent
    newText("<b>Do you agree to participate in this experiment?</b>")
        .center()
    ,
    newScale("consent",   "yes", "no")
        .center()
        .radio()
        .log()
        .labelsPosition("right")
        .print()
        .wait()
    ,
    
    // Blank
    newText("")
    ,
    newText("")
    ,
    
    // Clear error messages if the participant changes the input
    newKey("just for callback", "") 
        .callback( getText("errorID").remove() , getText("errorID").remove() )
    ,
    
    // Formatting text for error messages
    defaultText.color("Gray").print()
    ,
    
    // Continue. Only validate a click when ID information is input properly
    newButton("continue", "click here to continue")
        .center()
        .cssContainer({"margin-top":"1em", "margin-bottom":"1em"})
        .settings.css({"font-size": "inherit", "color": "white"})
        .settings.css("background-color", "blue")
        .print()
        
        // Check for participant ID 
        .wait(
             newFunction('dummy', ()=>true).test.is(true)
             
            // ID
            .and( getTextInput("participantID").testNot.text("")
                .failure( newText('errorID', "Please put your participant code.")))
        )
    ,
    
    // Store the texts from inputs into the Var elements
    getVar("participantID") .set( getTextInput("participantID") ),
    getVar("CONSENT")   .set( getScale("consent") )
);




// Instructions
newTrial("instructions",
    newHtml("instructions_text", "instructions.html")
        .center()
        .cssContainer({"margin-top":"-2em"})
        .print()
        ,
        
    newButton("continue", "click here to continue")
        .center()
        .cssContainer({"margin-top":"1em", "margin-bottom":"1em"})
        .settings.css({"font-size": "inherit", "color": "white"})
        .settings.css("background-color", "blue")
        .print()
        .wait()
);



// Practice session
Template("practice.csv", row =>
  newTrial("practice",
           newPrimer(),
           // Dashed sentence. Segmentation is marked by "*"
           newController("SelfPacedReadingParadigmSentence", {s : row.SENTENCE, splitRegex: /\*/})
           .center()
           .print()
           .log()
           .wait()
           .remove(),
           askPracticeQuestion(row))
           
    .log( "item"      , row.ITEM)
    .log( "condition" , row.CONDITION)
    .log( "correct" , getVar("correct") )
);




// Start experiment
newTrial( "start_experiment" ,
    defaultText
        .center()
        .cssContainer({"margin-top":"0.2em", "margin-bottom":"1em", "text-align": "center"})
        .print()
    ,
    newText("<h2>The practice session is over.<br> Let's move onto the main task.</p>")
        .center()
        .print()
    ,
    
    newButton("continue", "click here to continue")
        .center()
        .cssContainer({"margin-top":"1em", "margin-bottom":"1em"})
        .settings.css({"font-size": "inherit", "color": "white"})
        .settings.css("background-color", "blue")
        .print()
        .wait()
);




// Experimental trial
Template("experiment.csv", row =>
    newTrial( "experiment-"+row.TYPE,
              newPrimer(),
           // Dashed sentence. Segmentation is marked by "*"
           newController("SelfPacedReadingParadigmSentence", {s : row.SENTENCE, splitRegex: /\*/})
           .center()
           .print()
           .log()
           .wait()
           .remove(),
           askTrialQuestion(row))
           
    .log( "list"      , row.LIST)
    .log( "item"      , row.ITEM)
    .log( "condition" , row.CONDITION)
    .log( "factor1" , row.FACTOR1)
    .log( "factor2" , row.FACTOR2)
    .log( "correct" , getVar("correct") )    

);




// Final screen: explanation of the goal
newTrial("end",

    newText("<h2>The task is over. Thank you for your participation!</h2><p> </p>")
        .center()
        .print()
    ,
    newVar("computedAccuracy").set(getVar("ACCURACY")).set(v=>Math.round(v.filter(a=>a===true).length/v.length*100)),
    newText("accuracy").text(getVar("computedAccuracy"))
        .after(newText("%"))
    ,
    newText("The accuracy of your responses to the comprehension questions is: ")
        .center()
        .after(getText("accuracy"))
        .print()
    ,

    newText("<br> <br> <br> <br> <h2> You can now close the window. </h2>")
        .center()
        .print()
    ,

    // Trick: stay on this trial forever (until tab is closed)
    newButton().wait()
    )
    
.setOption("countsForProgressBar",false);
