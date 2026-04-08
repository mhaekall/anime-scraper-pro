from providers.oploverz import OploverzProvider
from providers.otakudesu import OtakudesuProvider
from providers.doronime import DoronimeProvider
from providers.samehadaku import SamehadakuProvider
from utils.extractor import UniversalExtractor
from services.transport import ProviderTransport

shared_transport = ProviderTransport()

oploverz_provider = OploverzProvider(transport=shared_transport)
otakudesu_provider = OtakudesuProvider(transport=shared_transport)
doronime_provider = DoronimeProvider()
samehadaku_provider = SamehadakuProvider(transport=shared_transport)
extractor = UniversalExtractor()
