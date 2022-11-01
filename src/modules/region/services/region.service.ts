import { Service } from 'medusa-extender';
import { EntityManager,DeepPartial } from 'typeorm';
import {default as MeudsaRegionService} from "@medusajs/medusa/dist/services/region";
import StoreService from '../../store/services/store.service';
import { 
    EventBusService,
    PaymentProviderService,
    FulfillmentProviderService
} from '@medusajs/medusa/dist/services';
import { FlagRouter } from "@medusajs/medusa/dist/utils/flag-router"
import { RegionRepository } from '../repositories/region.repository';
import { CountryRepository } from '@medusajs/medusa/dist/repositories/country';
import { CurrencyRepository } from '@medusajs/medusa/dist/repositories/currency';
import { TaxProviderRepository } from '@medusajs/medusa/dist/repositories/tax-provider';
import { PaymentProviderRepository } from '@medusajs/medusa/dist/repositories/payment-provider';
import { FulfillmentProviderRepository } from '@medusajs/medusa/dist/repositories/fulfillment-provider';
import { Region } from '../entities/region.entity';
import { FindConfig, Selector } from "@medusajs/medusa/dist/types/common"
import { MedusaError } from "medusa-core-utils"
import {buildQuery, setMetadata} from "@medusajs/medusa/dist/utils";
import {CreateRegionInput} from "../types/region";
import TaxInclusivePricingFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/tax-inclusive-pricing"
import { Currency } from '@medusajs/medusa';
type InjectedDependencies = {
    manager: EntityManager
    storeService: StoreService
    eventBusService: EventBusService
    paymentProviderService: PaymentProviderService
    fulfillmentProviderService: FulfillmentProviderService
    featureFlagRouter: FlagRouter
  
    regionRepository: typeof RegionRepository
    countryRepository: typeof CountryRepository
    currencyRepository: typeof CurrencyRepository
    taxProviderRepository: typeof TaxProviderRepository
    paymentProviderRepository: typeof PaymentProviderRepository
    fulfillmentProviderRepository: typeof FulfillmentProviderRepository
  };

@Service({override: MeudsaRegionService})
export class RegionService extends MeudsaRegionService {
    static resolutionKey = 'regionService';

    private readonly manager: EntityManager;
    private readonly regionRepository: typeof RegionRepository;
    private readonly container: InjectedDependencies;

    constructor(container: InjectedDependencies, private readonly config: any) {
        super(container);
        this.container = container;
        this.manager = container.manager;
        this.regionRepository = container.regionRepository;
    }

    
    /**
   * Lists all regions based on a query
   *
   * @param {object} selector - query object for find
   * @param {object} config - configuration settings
   * @return {Promise} result of the find operation
   */
  async list(
    selector: Selector<Region> = {},
    config: FindConfig<Region> = {
      relations: [],
      skip: 0,
      take: 10,
    }
  ): Promise<Region[]> {
    const regionRepo = this.manager.getCustomRepository(this.regionRepository);

    const query = buildQuery(selector, config)
    return regionRepo.find(query)
  }

  /**
   * Creates a region.
   *
   * @param data - the unvalidated region
   * @return the newly created region
   */
   async create(data: CreateRegionInput): Promise<Region> {
    return await this.atomicPhase_(async (manager) => {
      const regionRepository = manager.getCustomRepository(
        this.regionRepository
      )
      const currencyRepository = manager.getCustomRepository(
        this.currencyRepository_
      )

      const regionObject = { ...data } as DeepPartial<Region>
      const { metadata, currency_code, includes_tax, ...toValidate } = data

      //console.log("toValidate = ", toValidate);
      
      const validated = await this.validateFields(toValidate)

      console.log("validated *> ", validated);
      
      if (
        this.featureFlagRouter_.isFeatureEnabled(
          TaxInclusivePricingFeatureFlag.key
        )
      ) {
        if (typeof includes_tax !== "undefined") {
          regionObject.includes_tax = includes_tax
        }
      }
      
      if (currency_code) {
        // will throw if currency is not added to store currencies
        await this.validateCurrency(currency_code)
        const currency = await currencyRepository.findOne({
          where: { code: currency_code.toLowerCase() },
        })
        
        if (!currency) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Could not find currency with code ${currency_code}`
          )
        }

        regionObject.currency = currency
        regionObject.currency_code = currency_code.toLowerCase()
      }

      
      if (metadata) {
        regionObject.metadata = setMetadata(
          { metadata: regionObject.metadata ?? null },
          metadata
        )
      }
      
      console.log("validated ===> ", validated);
      
      for (const [key, value] of Object.entries(validated)) {
        regionObject[key] = value
      }

      const created = regionRepository.create(regionObject) as Region
      const result = await regionRepository.save(created)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RegionService.Events.CREATED, {
          id: result.id,
        })

      return result
    })
  }
/**
   * Validates a currency code. Will throw if the currency code doesn't exist.
   *
   * @param currencyCode - an ISO currency code
   * @throws if the provided currency code is invalid
   * @return void
   */
 protected async validateCurrency(
  currencyCode: Currency["code"]
): Promise<void | never> {
  const store = await this.container.storeService
    .withTransaction(this.transactionManager_)
    .retrieve({ relations: ["currencies"] })

    console.log("storeCurrencies => ", store.currencies);
  const storeCurrencies = store.currencies.map((curr) => curr.code)
  
  
  if (!storeCurrencies.includes(currencyCode.toLowerCase())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid currency code"
    )
  }
}

    /**
   * Retrieves a region by its id.
   *
   * @param regionId - the id of the region to retrieve
   * @param config - configuration settings
   * @return the region
   */
  async retrieve(
    regionId: string,
    config: FindConfig<Region> = {}
  ): Promise<Region | never> {
    const regionRepository = this.manager_.getCustomRepository(
      this.regionRepository_
    )

    const query = buildQuery({ id: regionId }, config)
    const region = await regionRepository.findOne(query)

    if (!region) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Region with ${regionId} was not found`
      )
    }

    return region
  }

}