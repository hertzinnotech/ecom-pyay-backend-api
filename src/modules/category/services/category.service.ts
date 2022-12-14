import { Service } from 'medusa-extender';
import { EntityManager,getManager } from 'typeorm';
import { EventBusService, TransactionBaseService } from "@medusajs/medusa";
import { CategoryRepository } from '../repositories/category.repository';
import { FindConfig, Selector,QuerySelector } from "@medusajs/medusa/dist/types/common";
import { Category } from '../entities/category.entity';
import { MedusaError } from "medusa-core-utils";
import { buildQuery } from "@medusajs/medusa/dist/utils";
import { CreateCategoryInput, UpdateCategoryInput } from '../types/category';

type InjectedDependencies = {
    manager: EntityManager;
    eventBusService: EventBusService;
    categoryRepository: typeof CategoryRepository
};

@Service()
export class CategoryService extends TransactionBaseService {
    static resolutionKey = 'categoryService';
    static Events = {
        UPDATED: "category.updated",
        CREATED: "category.created",
        DELETED: "category.deleted",
      }

      protected transactionManager_: EntityManager | undefined;
      protected readonly manager_: EntityManager;
      protected readonly categoryRepository_: typeof CategoryRepository;
      protected readonly eventBusService_: EventBusService;

    constructor(container: InjectedDependencies) {
        super(container);
        this.manager_ = container.manager;
        this.eventBusService_ = container.eventBusService;
        this.categoryRepository_ = container.categoryRepository;
    }

    /**
   * A generic retrieve used to find a category by different attributes.
   *
   * @param selector - category selector
   * @param config - find config
   * @returns a single category matching the query or throws
   */
  protected async retrieve_(
        selector: Selector<Category>,
        config: FindConfig<Category> = {}
        ): Promise<Category> {
    const manager = this.manager_

    const categoryRepo = manager.getCustomRepository(this.categoryRepository_);

    const { relations, ...query } = buildQuery(selector, config)

    const category = await categoryRepo.findOneWithRelations(
      relations as (keyof Category)[],
      query
    )
    
    if (!category) {
      const selectorConstraints = Object.entries(selector)
        .map((key, value) => `${key}: ${value}`)
        .join(", ")

      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Category with ${selectorConstraints} was not found`
      )
    }

    return category;
  }

  /**
   * Retrieve a category by id
   *
   * @param categoryId - id of the category to retrieve
   * @param config - category config
   * @experimental This feature is under development and may change in the future.
   * To use this feature please enable the corresponding feature flag in your medusa backend project.
   * @returns a category
   */
   async retrieve(
    categoryId: string,
    config: FindConfig<Category> = {}
  ): Promise<Category | never> {
    return await this.retrieve_({ id: categoryId }, config)
  }

  /**
   * Find a category by name.
   *
   * @param name of category
   * @param config - find config
   * @return a category with matching name
   */
   async retrieveByName(
    name: string,
    config: FindConfig<Category> = {}
  ): Promise<Category | unknown> {
    return await this.retrieve_({ name }, config)
  }
  /**
   * Retrieve a subtree of the category
   *
   * @param categoryId - id of the category to retrieve
   *
   * @returns a category
   */
   async findDescendants(
    categoryId: string,
    config: FindConfig<Category> = {}
  ): Promise<Category[] | never> {

    const manager = this.manager_;
    const parent = await this.retrieve(categoryId);

    // const children = await manager.getTreeRepository(Category)
    //                         .findDescendants(parent);
    const children = await manager.getTreeRepository(Category)
                          .findDescendants(parent);
    return children;
  }
 /**
  * List a tree of cateory
  * @returns  Category[]
  */
  async findTreeList(): Promise<Category[]> {
    const manager = this.manager_

    const categories = await manager.getTreeRepository(Category).findTrees();
    //const categories = await manager.getTreeRepository(Category).findRoots();
    
    return categories;
  }
  /**
   * Lists Category based on the provided parameters and includes the count of
   * Category that match the query.
   * @return an array containing the Category as
   *   the first element and the total count of Category that matches the query
   *   as the second element.
   */
   async listAndCount(
    selector: QuerySelector<Category>,
    config: FindConfig<Category> = {
      skip: 0,
      take: 20,
    }
  ): Promise<[Category[], number]> {
    const manager = this.manager_
    const categoryRepo = manager.getCustomRepository(this.categoryRepository_);
  

    const selector_ = { ...selector }
    let q: string | undefined
    if ("q" in selector_) {
      q = selector_.q
      delete selector_.q
    }
   
    const query = buildQuery(selector_, config)
   
    if (q) {
      return await categoryRepo.getFreeTextSearchResultsAndCount(q, query)
    }
    return await categoryRepo.findAndCount(query);
  }

  /**
   * Creates a category
   *
   * @experimental This feature is under development and may change in the future.
   * To use this feature please enable the corresponding feature flag in your medusa backend project.
   * @returns the created category
   */
   async create(data: CreateCategoryInput): Promise<Category | never> {
    return await this.atomicPhase_(async (manager) => {
      const categoryRepo: CategoryRepository = manager.getCustomRepository(this.categoryRepository_);
      
      // check the category name already exists
      const existing = await this.retrieveByName(data.name).catch(() => undefined);
      if(existing) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          "A category with the given name already exist."
        );
      }

      
      const category = categoryRepo.create(data)

      await this.eventBusService_
        .withTransaction(manager)
        .emit(CategoryService.Events.CREATED, {
          id: category.id,
        })

      return await categoryRepo.save(category)
    })
  }
  
  /**
   * Update a cateogry
   *
   * @returns the updated category
   */
  async update(
    categoryId: string,
    data: UpdateCategoryInput
  ): Promise<Category | never> {
    return await this.atomicPhase_(async (transactionManager) => {
      const categoryRepo: CategoryRepository = transactionManager.getCustomRepository(this.categoryRepository_);

      const category = await this.retrieve(categoryId)

      // check the category's id and its parent id is the same
      if(category.id == data.parent.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "This operation does not allow."
        );
      }

      for (const key of Object.keys(data)) {
        if (typeof data[key] !== `undefined`) {
            category[key] = data[key]
        }
      }

      const result = await categoryRepo.save(category)

      await this.eventBusService_
        .withTransaction(transactionManager)
        .emit(CategoryService.Events.UPDATED, {
          id: result.id,
        })

      return result
    })
  }

  /**
   * Deletes a category from
   * 
   * @param categoryId - the id of the category to delete
   */
   async delete(categoryId: string): Promise<void> {
    return await this.atomicPhase_(async (transactionManager) => {
      const categoryRepo = transactionManager.getCustomRepository(
        this.categoryRepository_
      );
      
      //1. retrieve a category to delete
     // const parent_category = await categoryRepo.findOneOrFail()
      const category = await this.retrieve(categoryId).catch(
        () => void 0
      )

      if (!category) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Category with Id, ${categoryId} was not found`
        )
      }
      const remove_category_id: string = category.id;
      const remove_category_parent_id: string = category.parent_id;

      
      // 1. delete itself in order to unlink its parent nodes
      await transactionManager
              .createQueryBuilder()
              .delete()
              .from("category_closure")
              .where("descendant_id = :id", { id: category.id })
              .execute();

      //2. delete all the descendent nodes from the closure table
      await transactionManager
              .createQueryBuilder()
              .delete()
              .from("category_closure")
              .where("ancestor_id = :id", { id: category.id })
              .execute();

      //3. update its child categories's parent_id
      await categoryRepo.update({
          parent_id: remove_category_id // where parent_id = remove_category_id
        },
        {
          parent_id: remove_category_parent_id // set parent_id = remove_category_parent_id
        });

      //4. delete the category itself
      await  transactionManager
          .createQueryBuilder()
          .delete()
          .from(Category)
          .where("id = :id", { id: category.id })
          .execute()

      await this.eventBusService_
        .withTransaction(transactionManager)
        .emit(CategoryService.Events.DELETED, {
          id: categoryId,
        })
    })
  }

}