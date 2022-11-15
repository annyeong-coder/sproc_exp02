##  Specify the packages of interest
packages = c("Rmisc", #for summarizing data
             "dplyr", #for selecting/summarizing data, etc.
             "lme4", #for mixed-effects modeling
             "lmerTest", #for mixed-effects modeling
             "emmeans", #for post-hoc analysis
             "ggplot2") #for plotting


##  Load packages; install them when they are not installed
package.check <- lapply(
  packages,
  FUN = function(x) {
    if (!require(x, character.only = TRUE)) {
      install.packages(x, dependencies = TRUE)
      library(x, character.only = TRUE)
    }
  }
)


##  Load data from a csv file
rtdata <- read.csv(file.choose(), header = TRUE, stringsAsFactors = T)


#################################################
##  STEP 1: Data trimming 
#################################################

##  Extract trials with correct answers to the comprehension questions
rtdata <- rtdata[rtdata$accuracy == "1",]


##  Remove extreme RTs below 100ms or above 4,000ms
rtdata <- rtdata %>%
  filter(rt <= 4000) %>%
  filter(rt >= 100)


##  Remove outliers 
##  (e.g., RTs in excess of 2.5SDs above or below the mean for a condition by item and condition) 
rtdata <- rtdata %>% dplyr::group_by(item, condition, segment) %>% 
  dplyr::mutate(avg = mean(rt), stdev = sd(rt)) %>% 
  filter(rt <= avg + 2.5*stdev) %>% 
  filter(rt >= avg - 2.5*stdev) %>% 
  as.data.frame() 


##  Compute residual reading time (rrt)
##  Build a regression model with (a) length as main effect and (b) length within participant as random effect
rtdata$length <- nchar(as.character(rtdata$text))
residual_model <- lmer(rt ~ length + (1 | participant), rtdata, REML = FALSE)
rtdata$rrt <- residuals(residual_model)



#################################################
##  STEP 2: Data visualization 
#################################################

##  Create a plot
ggplot(rtdata, aes(x=segment, y=rrt, group=condition, linetype=condition, color=condition)) + 
  stat_summary(fun=mean, geom="line") + 
  stat_summary(fun.data=mean_se, geom="errorbar", linetype="solid", width=0.3) +
  labs(x="segment", y="residual reading time") 



#################################################
##  STEP 3: Mixed-effects regression analysis
#################################################

##  Select (critical) region for analysis
rtdata_segment = filter(rtdata, segment == "3")


##  Code columns as factors
rtdata_segment$participant <- as.factor(rtdata_segment$participant)
rtdata_segment$item <- as.factor(rtdata_segment$item)
rtdata_segment$factor1 <- as.factor(rtdata_segment$factor1)
rtdata_segment$factor2 <- as.factor(rtdata_segment$factor2)


##  Make new predictors for contrast (deviation) coding (vs. treatment coding)
rtdata_segment$factor1c <- rtdata_segment$factor1 
rtdata_segment$factor2c <- rtdata_segment$factor2


##  Assign new values to the contrasts; intercept is now a grand mean 
contrasts(rtdata_segment$factor1c) <- c(-.5, .5)
contrasts(rtdata_segment$factor2c) <- c(-.5, .5)


##  Construct a mixed-effects model 
#model_rt = lmer(rrt ~ factor1c * factor2c + (1 + factor1c * factor2c | participant) + (1 + factor1c * factor2c| item), data=rtdata_segment)
model_rt = lmer(rrt ~ factor1c * factor2c + (1 | participant) + (1 + factor1c * factor2c| item), data=rtdata_segment)
summary(model_rt)


##  Conduct post-hoc analyses
emm = emmeans(model_rt, ~ factor1c * factor2c)
pairs(emm)

