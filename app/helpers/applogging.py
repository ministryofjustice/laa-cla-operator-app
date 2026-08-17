from functools import wraps
import logging, time 

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s",force=True)

logger = logging.getLogger(__name__)

logger
def applogging(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try: 
            result = func(*args, **kwargs)
            exec_time = time.time() - start_time
            logger.info(
                f"\nFunction Execute '{func.__name__}' Execute sucessfully in {exec_time: .4f} seconds \n"
            )
            return result 

        except Exception as e:
                exec_time = time.time() - start_time
                logger.info(
                            f"\Error Execute '{func.__name__}' Execute sucessfully in {exec_time: .4f} seconds {e} \n",
                            exc_info=True
                        )
    return wrapper 