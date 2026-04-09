# GigShield Monitoring & Logging Handbook

To improve observability and debugging, I've enhanced the logging system. This guide explains how to use and view logs effectively.

## 1. Structured Log Format
Logs are now prefixed with `GS_LOG` and include the module name and log level. 
**Example output:**
`GS_LOG | INFO | apps.users.views | [POST] Driver login successful: ZMT-DRV-0001`

## 2. Using Loggers in your Code
To log events in any app, use the standard Python logger. I've configured a root logger for all `apps.*` modules.

```python
import logging
logger = logging.getLogger(__name__)

def my_view(request):
    logger.info(f"Processing request for {request.user}")
    try:
        # ... logic ...
    except Exception as e:
        logger.error(f"Action failed: {str(e)}", exc_info=True)
```

## 3. Log Levels
You can control the verbosity of logs via environment variables on Render:
- `DJANGO_LOG_LEVEL`: Controls Django internal logs (default: `INFO`)
- `LOG_LEVEL`: General level (configured in root)

## 4. Viewing Logs on Render
1. Go to your **Render Dashboard**.
2. Select the `gigshield-backend` service.
3. Click on the **Logs** tab in the sidebar.
4. You can filter logs by searching for `GS_LOG` to see only application-specific events.

## 5. Recommended Tools for Advanced Analysis
For a more professional setup, consider these integrations:
- **Sentry**: For error tracking and performance monitoring.
- **BetterStack (Logtail)**: For structured logging and long-term storage (Render has a built-in integration).
- **Axiom**: Excellent for high-volume event logging.
