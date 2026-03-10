Feature: Create Product

  Background:
    Given I am logged in and on the Products page

  @smoke @products @create
  Scenario: Merchant creates a product with required fields only
    When I click Add product
    And I fill the product title with a generated name
    And I fill the inventory SKU with a generated SKU
    And I click Create Product
    Then the product should appear in the listing

  @smoke @products @create
  Scenario: Merchant creates a product with a size variant
    When I click Add product
    And I fill the product title with a generated name
    And I add a size variant "X-Large" with a generated SKU
    And I fill the inventory SKU with a generated SKU
    And I click Create Product
    Then the product should appear in the listing

  @regression @products @negative @create
  Scenario: Merchant cannot create a product without a title
    When I click Add product
    And I fill the inventory SKU with a generated SKU
    Then the form should remain on the create page

  @regression @products @create
  Scenario: Product URL updates to contain product ID after creation
    When I click Add product
    And I fill the product title with a generated name
    And I fill the inventory SKU with a generated SKU
    And I click Create Product
    Then the URL should contain the product ID
