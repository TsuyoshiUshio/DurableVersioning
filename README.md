# Durable Functions Versioning sample

This repo is a sample for Durable Functions which enable you to Zero downtime deployment. 

When you change Orchestrator logic or the interface of Activity Functions, please execute the script. 

This script enbable us to versioning your Durable code. It will do 

1. Copy the current Durable Code with changing namespace with current version number under migration directory
2. Update version number of your code

Even if you have a running instances, your deployment won't harm your running process. 

# How to use 

## Follow the naming convention. 

You need to follow the Naming Convension. 

## Naming convention of the Durable Functions code

Function name of Orchestrator Client, Orchestrator, Activity Function should be named as `functionname_d_d_d` d is any int number (Semantic versioning).

For example, 

```
        [FunctionName("VersioningSample_1_0_5")]
        public static async Task<List<string>> RunOrchestrator(
            [OrchestrationTrigger] DurableOrchestrationContext context)
                   :
```

You can see the example on this repo. 

## migration

```
cd command 
node migration.js NEW_VERSION
```

## example

Use semantic versioning. 

```
node migration.js 1.2.3 
```

# TODO 

Currently, the script doesn't support subdirectory. I'll fix it soon.
